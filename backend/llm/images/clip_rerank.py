"""Re-ranking visual local con CLIP y filtrado de clases negativas zero-shot.

Evalúa la similitud semántica entre imágenes candidatas y la descripción pedagógica,
descartando aquellas que correspondan a clases negativas:
1. Persona identificable / retrato / grupo de personas
2. Militar / uniforme / emblema / escudo
3. Póster o imagen con mucho texto
4. Captura de pantalla de software / terminal
5. Meme o gráfico humorístico

Requiere open_clip y PyTorch en local; degrada elegantemente si no están instalados.
"""

from __future__ import annotations

import io
import os
import time
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

# Umbrales calibrados para CLIP ViT-B-32
DEFAULT_MIN_SIMILARITY = float(os.getenv("CLIP_MIN_SIMILARITY", "0.18"))
DEFAULT_STRONG_NEGATIVE_THRESHOLD = float(os.getenv("CLIP_STRONG_NEG_THRESHOLD", "0.235"))
DEFAULT_SPECIFICITY_MARGIN = float(os.getenv("CLIP_SPECIFICITY_MARGIN", "-0.01"))
DEFAULT_PERSON_THRESHOLD = float(os.getenv("CLIP_PERSON_THRESHOLD", "0.205"))
MAX_HAMMING_DISTANCE_DUPLICATE = 6

PERSON_NEGATIVE_CLASSES: set[str] = {
    "persona",
    "persona_primer_plano",
    "persona_rostro",
    "persona_posando",
}

GENERIC_TECH_PROMPTS: list[str] = [
    "a photo of computer technology",
    "a data center",
    "a circuit board",
    "abstract technology background",
]

SERVER_ROOM_PROMPTS: list[str] = [
    "a server room with rows of server racks",
    "datacenter server racks corridor",
    "datacenter server room",
]

NEGATIVE_CLASSES: dict[str, str] = {
    "persona": "an identifiable person, man or woman, portrait or group of people",
    "persona_primer_plano": "close-up portrait of a person, person's face, people posing",
    "persona_rostro": "a close-up of a person's face, human face portrait looking at camera",
    "persona_posando": "people posing, person standing in foreground looking at camera or equipment",
    "militar": "military soldiers in uniform, armed forces, military badge, coat of arms, or military shield",
    "poster_texto": "poster or flyer with a lot of text, awareness campaign poster, typography banner with words",
    "screenshot": "computer screenshot, software user interface window, operating system desktop, code terminal",
    "meme": "internet meme, humorous graphic with impact font captions",
    "diagrama": "technical diagram, architecture diagram, flow chart, schematic diagram, sequence diagram, block diagram",
    "esquema": "technical schema, engineering schematic, blueprint, circuit diagram, wiring schema",
    "grafico_chart": "data chart, graph, bar chart, pie chart, line plot, statistical diagram",
    "infografia": "infographic, vector illustration infographic, educational banner with arrows and labels",
    "captura": "software screen capture, application interface, code window, terminal dump",
    "nube_palabras": "word cloud, tag cloud, cluster of text buzzwords, word collage",
    "ia_render3d": "AI generated image, 3D CGI render, digital art illustration, artificial synthetic render",
    "die_chip_plano": "silicon chip die microphotography, semiconductor wafer die, microprocessor die, architectural floor plan, blueprint plan",
}

GENERATED_NEGATIVE_CLASSES: dict[str, str] = {
    "persona": "an identifiable person, man or woman, portrait or group of people",
    "persona_primer_plano": "close-up portrait of a person, person's face, people posing",
    "persona_rostro": "a close-up of a person's face, human face portrait looking at camera",
    "persona_posando": "people posing, person standing in foreground looking at camera or equipment",
    "infantil_casitas": "children, childlike cartoon, kids, cute house, suburban residential cottage, country landscape, rural house",
    "persona_infantil": "child, toddler, group of children, childish cartoon character, fairy tale drawing",
    "militar": "military soldiers in uniform, armed forces, military badge, coat of arms, or military shield",
    "poster_texto": "poster or flyer with a lot of text, awareness campaign poster, typography banner with words",
    "screenshot": "computer screenshot, software user interface window, operating system desktop, code terminal",
    "meme": "internet meme, humorous graphic with impact font captions",
}


def compute_dhash(img: Any, hash_size: int = 8) -> str:
    """Calcula el hash perceptual dHash (Difference Hash) de 64 bits en formato hexadecimal."""
    from PIL import Image

    gray = img.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    raw_bytes = list(gray.tobytes())
    difference = []
    width = hash_size + 1
    for row in range(hash_size):
        for col in range(hash_size):
            pixel_left = raw_bytes[row * width + col]
            pixel_right = raw_bytes[row * width + col + 1]
            difference.append(pixel_left > pixel_right)
    decimal_val = 0
    hex_str = []
    for index, value in enumerate(difference):
        if value:
            decimal_val += 1 << (index % 4)
        if index % 4 == 3:
            hex_str.append(hex(decimal_val)[2:])
            decimal_val = 0
    return "".join(hex_str)


def hamming_distance(h1: str, h2: str) -> int:
    """Calcula la distancia de Hamming en bits entre dos hashes hexadecimales."""
    if not h1 or not h2 or len(h1) != len(h2):
        return 64
    x = int(h1, 16) ^ int(h2, 16)
    return bin(x).count("1")


class ClipReranker:
    """Clase singleton/perezosa para re-ranking visual con CLIP."""

    _instance: ClipReranker | None = None

    def __init__(self) -> None:
        self.model = None
        self.preprocess = None
        self.tokenizer = None
        self.device = "cpu"
        self.available = False
        self.negative_embeddings = None
        self.generated_negative_embeddings = None
        self.generic_embeddings = None
        self.server_room_embeddings = None
        self.load_duration_s = 0.0
        self.vram_mb = 0.0

    @classmethod
    def get_instance(cls) -> ClipReranker:
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._load()
        return cls._instance

    def _load(self) -> None:
        try:
            import open_clip
            import torch

            t0 = time.monotonic()

            # Selección de dispositivo: CPU por defecto si VRAM es baja para evitar OOM con el LLM
            force_cpu = os.getenv("CLIP_DEVICE", "cpu").strip().lower() == "cpu"
            if not force_cpu and torch.cuda.is_available():
                free_vram, total_vram = torch.cuda.mem_get_info()
                # Exigir al menos 1.5 GB libres en GPU para no interferir con el LLM
                if free_vram >= 1500 * 1024 * 1024:
                    self.device = "cuda"
                    self.vram_mb = (total_vram - free_vram) / (1024 * 1024)
                else:
                    self.device = "cpu"
                    logger.info("clip using CPU because GPU VRAM is reserved for LLM", free_mb=free_vram // (1024 * 1024))
            else:
                self.device = "cpu"

            model_name = os.getenv("CLIP_MODEL_NAME", "ViT-B-32")
            pretrained = os.getenv("CLIP_PRETRAINED", "laion2b_s34b_b79k")

            logger.info("loading local CLIP model", model=model_name, pretrained=pretrained, device=self.device)
            self.model, _, self.preprocess = open_clip.create_model_and_transforms(
                model_name, pretrained=pretrained, device=self.device
            )
            self.model.eval()
            self.tokenizer = open_clip.get_tokenizer(model_name)

            # Precomputar embeddings normalizados de clases negativas (para fotos de búsqueda)
            neg_texts = list(NEGATIVE_CLASSES.values())
            tokens = self.tokenizer(neg_texts).to(self.device)
            with torch.no_grad():
                embs = self.model.encode_text(tokens)
                self.negative_embeddings = embs / embs.norm(dim=-1, keepdim=True)

            # Precomputar embeddings normalizados de clases negativas (para imágenes generadas)
            gen_neg_texts = list(GENERATED_NEGATIVE_CLASSES.values())
            gen_tokens = self.tokenizer(gen_neg_texts).to(self.device)
            with torch.no_grad():
                gen_embs = self.model.encode_text(gen_tokens)
                self.generated_negative_embeddings = gen_embs / gen_embs.norm(dim=-1, keepdim=True)

            # Precomputar embeddings normalizados de prompts genéricos para especificidad
            g_tokens = self.tokenizer(GENERIC_TECH_PROMPTS).to(self.device)
            with torch.no_grad():
                g_embs = self.model.encode_text(g_tokens)
                self.generic_embeddings = g_embs / g_embs.norm(dim=-1, keepdim=True)

            # Precomputar embeddings normalizados de sala de servidores para penalización fuera de infraestructura
            sr_tokens = self.tokenizer(SERVER_ROOM_PROMPTS).to(self.device)
            with torch.no_grad():
                sr_embs = self.model.encode_text(sr_tokens)
                self.server_room_embeddings = sr_embs / sr_embs.norm(dim=-1, keepdim=True)

            self.load_duration_s = round(time.monotonic() - t0, 3)
            self.available = True
            logger.info("CLIP model loaded successfully", device=self.device, duration_s=self.load_duration_s)

        except Exception as exc:
            self.available = False
            logger.warning("CLIP model unavailable; falling back to heuristic scoring", error=str(exc)[:120])

    def score_candidates(
        self,
        candidates: list[dict[str, Any]],
        concept: str,
        query: str,
        description: str,
        min_similarity: float = DEFAULT_MIN_SIMILARITY,
        *,
        used_hashes: tuple[str, ...] | set[str] | list[str] = (),
    ) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
        """Puntúa y filtra candidatas con CLIP contra la consulta y clases negativas.

        Retorna (mejor_candidata_o_None, lista_diagnosticos).
        """
        diagnostics: list[dict[str, Any]] = []
        if not self.available or self.model is None:
            # Fallback heurístico si CLIP no está disponible
            for c in candidates:
                diagnostics.append({
                    "title": c.get("title"),
                    "url": c.get("url"),
                    "pos_score": 0.0,
                    "top_neg_class": None,
                    "top_neg_score": 0.0,
                    "passed": True,
                    "reason": "clip_unavailable_heuristic",
                })
            best = candidates[0] if candidates else None
            return best, diagnostics

        import torch
        from PIL import Image

        # Construir prompt positivo fotográfico combinando concepto, consulta y descripción técnica
        pos_prompt = f"a real photograph of {concept}. {query}. {description}".strip()
        pos_tokens = self.tokenizer([pos_prompt]).to(self.device)

        with torch.no_grad():
            pos_emb = self.model.encode_text(pos_tokens)
            pos_emb = pos_emb / pos_emb.norm(dim=-1, keepdim=True)

        neg_names = list(NEGATIVE_CLASSES.keys())
        accepted_candidates: list[tuple[float, dict[str, Any]]] = []

        import requests
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry

        session = requests.Session()
        retries = Retry(
            total=3,
            backoff_factor=1.5,
            status_forcelist=[429, 500, 502, 503, 504],
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retries)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        session.headers.update({"User-Agent": "GenOVA/1.0 (https://github.com/GenOVA-UPAO/GenOVA; soporte@genova.edu.pe)"})

        from llm.images import image_cache

        for c in candidates:
            url = c.get("url")
            title = c.get("title", "")
            if not url:
                continue

            # Obtener bytes (ya en memoria o mediante descarga)
            try:
                raw_bytes = c.get("_downloaded_bytes")
                if not raw_bytes:
                    resp = session.get(url, timeout=5.0, stream=True)
                    if resp.status_code != 200 or len(resp.content) < 500:
                        diagnostics.append({
                            "title": title,
                            "url": url,
                            "passed": False,
                            "pos_score": 0.0,
                            "top_neg_class": None,
                            "top_neg_score": 0.0,
                            "reason": f"download_failed_http_{resp.status_code}",
                        })
                        continue
                    raw_bytes = resp.content

                pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
                phash = compute_dhash(pil_img)
            except Exception as exc:
                diagnostics.append({
                    "title": title,
                    "url": url,
                    "passed": False,
                    "pos_score": 0.0,
                    "top_neg_class": None,
                    "top_neg_score": 0.0,
                    "reason": f"image_decode_error:{str(exc)[:50]}",
                })
                continue

            # Descarte 0: Deduplicación perceptual dentro del mismo OVA
            is_dup = False
            dup_dist = 64
            for uh in used_hashes:
                d = hamming_distance(phash, uh)
                if d <= MAX_HAMMING_DISTANCE_DUPLICATE:
                    is_dup = True
                    dup_dist = d
                    break

            try:
                img_tensor = self.preprocess(pil_img).unsqueeze(0).to(self.device)
                with torch.no_grad():
                    img_emb = self.model.encode_image(img_tensor)
                    img_emb = img_emb / img_emb.norm(dim=-1, keepdim=True)

                    sim_pos = float((img_emb @ pos_emb.T).item())
                    sim_negs = (img_emb @ self.negative_embeddings.T).squeeze(0).tolist()
                    sim_generics = (
                        (img_emb @ self.generic_embeddings.T).squeeze(0).tolist()
                        if self.generic_embeddings is not None
                        else [0.0]
                    )

                neg_scores = dict(zip(neg_names, sim_negs, strict=False))
                top_neg_class, top_neg_score = max(neg_scores.items(), key=lambda item: item[1])

                top_gen_score = max(sim_generics)
                top_gen_prompt = (
                    GENERIC_TECH_PROMPTS[sim_generics.index(top_gen_score)]
                    if self.generic_embeddings is not None
                    else "none"
                )
                specificity_margin = sim_pos - top_gen_score

                # Penalización por reutilización en consultas previas distintas
                prev_queries = image_cache.get_image_usage(phash)
                norm_current = image_cache.normalize_prompt(f"{query} {concept}")
                other_queries = [pq for pq in prev_queries if image_cache.normalize_prompt(pq) != norm_current]
                usage_penalty = min(0.12, 0.04 * len(other_queries)) if other_queries else 0.0
                effective_score = sim_pos - usage_penalty

                # Evaluación de clases de persona con umbral calibrado (DEFAULT_PERSON_THRESHOLD = 0.205)
                persona_scores = {k: v for k, v in neg_scores.items() if k.startswith("persona")}
                top_p_class, top_p_score = (
                    max(persona_scores.items(), key=lambda it: it[1]) if persona_scores else ("", 0.0)
                )

                # Penalización / descarte de sala de servidores fuera de infraestructura
                from llm.images.query_builder import is_infrastructure_topic

                is_infra = is_infrastructure_topic(concept, description)
                top_sr_score = 0.0
                sr_penalty = 0.0
                if self.server_room_embeddings is not None and not is_infra:
                    sim_srs = (img_emb @ self.server_room_embeddings.T).squeeze(0).tolist()
                    top_sr_score = max(sim_srs)
                    if top_sr_score > 0.16:
                        sr_penalty = (top_sr_score - 0.16) * 0.5
                        effective_score -= sr_penalty

                # Reglas de descarte en cascada:
                discard_reason = None
                if is_dup:
                    discard_reason = f"duplicada_mismo_ova (dist={dup_dist} <= {MAX_HAMMING_DISTANCE_DUPLICATE})"
                # 1. Competencia zero-shot: gana una clase negativa
                elif top_neg_score >= sim_pos:
                    discard_reason = f"negativa_ganadora:{top_neg_class} ({top_neg_score:.3f} >= {sim_pos:.3f})"
                # 2. Persona identificable / rostro / posando con umbral calibrado
                elif top_p_score >= DEFAULT_PERSON_THRESHOLD:
                    discard_reason = f"persona_detectada:{top_p_class} ({top_p_score:.3f} >= {DEFAULT_PERSON_THRESHOLD:.3f})"
                # 3. Sala de servidores en tema no de infraestructura
                elif not is_infra and top_sr_score >= sim_pos:
                    discard_reason = f"negativa_servidores: sala de servidores en tema no de infraestructura ({top_sr_score:.3f} >= {sim_pos:.3f})"
                elif not is_infra and top_sr_score >= DEFAULT_STRONG_NEGATIVE_THRESHOLD:
                    discard_reason = f"fuerte_servidores: sala de servidores dominante en tema no de infraestructura ({top_sr_score:.3f} >= {DEFAULT_STRONG_NEGATIVE_THRESHOLD:.3f})"
                # 4. Presencia negativa dominante (militar, diagrama, chip die, render, etc.)
                elif top_neg_score >= DEFAULT_STRONG_NEGATIVE_THRESHOLD:
                    discard_reason = f"fuerte_negativa:{top_neg_class} ({top_neg_score:.3f} >= {DEFAULT_STRONG_NEGATIVE_THRESHOLD:.3f})"
                # 5. Margen de especificidad: rechaza imágenes genéricas que encajan con todo
                elif specificity_margin < DEFAULT_SPECIFICITY_MARGIN:
                    discard_reason = (
                        f"especificidad_insuficiente (pos={sim_pos:.3f} vs gen={top_gen_score:.3f} "
                        f"[{top_gen_prompt}], margen={specificity_margin:.3f} < {DEFAULT_SPECIFICITY_MARGIN:.3f})"
                    )
                # 6. Umbral mínimo de similitud positiva
                elif sim_pos < min_similarity:
                    discard_reason = f"umbral_minimo ({sim_pos:.3f} < {min_similarity:.3f})"

                diag = {
                    "title": title,
                    "url": url,
                    "phash": phash,
                    "pos_score": round(sim_pos, 4),
                    "effective_score": round(effective_score, 4),
                    "usage_penalty": round(usage_penalty, 4),
                    "server_room_score": round(top_sr_score, 4),
                    "server_room_penalty": round(sr_penalty, 4),
                    "top_neg_class": top_neg_class,
                    "top_neg_score": round(top_neg_score, 4),
                    "top_persona_class": top_p_class,
                    "top_persona_score": round(top_p_score, 4),
                    "top_generic_prompt": top_gen_prompt,
                    "top_generic_score": round(top_gen_score, 4),
                    "specificity_margin": round(specificity_margin, 4),
                    "neg_scores": {k: round(v, 4) for k, v in neg_scores.items()},
                    "passed": discard_reason is None,
                    "reason": discard_reason or "aprobado",
                }
                diagnostics.append(diag)

                if discard_reason is None:
                    c_with_score = dict(c)
                    c_with_score["phash"] = phash
                    c_with_score["clip_score"] = effective_score
                    c_with_score["raw_clip_score"] = sim_pos
                    c_with_score["usage_penalty"] = usage_penalty
                    c_with_score["server_room_score"] = top_sr_score
                    c_with_score["server_room_penalty"] = sr_penalty
                    c_with_score["clip_top_neg"] = top_neg_class
                    c_with_score["clip_top_neg_score"] = top_neg_score
                    c_with_score["specificity_margin"] = specificity_margin
                    c_with_score["_downloaded_bytes"] = raw_bytes
                    accepted_candidates.append((effective_score, c_with_score))

            except Exception as exc:
                diagnostics.append({
                    "title": title,
                    "url": url,
                    "passed": False,
                    "pos_score": 0.0,
                    "top_neg_class": None,
                    "top_neg_score": 0.0,
                    "reason": f"clip_inference_error:{str(exc)[:50]}",
                })

        if not accepted_candidates:
            logger.info(
                "no candidates passed CLIP re-ranking filters",
                concept=concept,
                candidates_evaluated=len(diagnostics),
            )
            return None, diagnostics

        # Ordenar por similitud positiva descendente
        accepted_candidates.sort(key=lambda item: item[0], reverse=True)
        best_candidate = accepted_candidates[0][1]

        logger.info(
            "CLIP candidate selected",
            title=best_candidate.get("title"),
            score=best_candidate.get("clip_score"),
            passed_count=len(accepted_candidates),
            total_evaluated=len(diagnostics),
        )
        return best_candidate, diagnostics

    def validate_generated_image(
        self,
        image_input: str | bytes | Any,
        concept: str,
        subject_prompt: str,
        min_similarity: float = DEFAULT_MIN_SIMILARITY,
    ) -> tuple[bool, str, float, dict[str, Any]]:
        """Valida una imagen generada con CLIP contra el sujeto concreto y negativos infantiles/casitas.

        Retorna (aprobada, motivo, clip_score, diagnostico).
        """
        if not self.available or self.model is None or self.generated_negative_embeddings is None:
            return True, "clip_unavailable", 0.0, {}

        import base64
        import io

        import torch
        from PIL import Image

        try:
            if isinstance(image_input, str):
                b64 = image_input.split(",", 1)[-1]
                pil_img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")
            elif isinstance(image_input, (bytes, bytearray)):
                pil_img = Image.open(io.BytesIO(image_input)).convert("RGB")
            elif hasattr(image_input, "convert"):
                pil_img = image_input.convert("RGB")
            else:
                return False, "formato_imagen_no_valido", 0.0, {}
        except Exception as exc:
            return False, f"error_decodificacion:{str(exc)[:40]}", 0.0, {}

        pos_prompt = f"a professional technical illustration of {concept}. {subject_prompt}".strip()
        pos_tokens = self.tokenizer([pos_prompt]).to(self.device)

        with torch.no_grad():
            pos_emb = self.model.encode_text(pos_tokens)
            pos_emb = pos_emb / pos_emb.norm(dim=-1, keepdim=True)

            img_tensor = self.preprocess(pil_img).unsqueeze(0).to(self.device)
            img_emb = self.model.encode_image(img_tensor)
            img_emb = img_emb / img_emb.norm(dim=-1, keepdim=True)

            sim_pos = float((img_emb @ pos_emb.T).item())
            sim_negs = (img_emb @ self.generated_negative_embeddings.T).squeeze(0).tolist()
            sim_generics = (
                (img_emb @ self.generic_embeddings.T).squeeze(0).tolist()
                if self.generic_embeddings is not None
                else [0.0]
            )

        neg_names = list(GENERATED_NEGATIVE_CLASSES.keys())
        neg_scores = dict(zip(neg_names, sim_negs, strict=False))
        top_neg_class, top_neg_score = max(neg_scores.items(), key=lambda item: item[1])

        # Evaluación de clases de persona con umbral calibrado (DEFAULT_PERSON_THRESHOLD = 0.205)
        person_scores = {k: v for k, v in neg_scores.items() if k in PERSON_NEGATIVE_CLASSES}
        top_p_class, top_p_score = (
            max(person_scores.items(), key=lambda item: item[1]) if person_scores else (None, 0.0)
        )

        # Control de sala de servidores para temas que no son de infraestructura
        from llm.images.query_builder import is_infrastructure_topic

        is_infra = is_infrastructure_topic(concept, subject_prompt)
        top_sr_score = 0.0
        if self.server_room_embeddings is not None and not is_infra:
            sim_servers = (img_emb @ self.server_room_embeddings.T).squeeze(0).tolist()
            top_sr_score = max(sim_servers)

        top_gen_score = max(sim_generics)
        specificity_margin = sim_pos - top_gen_score

        diag = {
            "pos_score": round(sim_pos, 4),
            "top_neg_class": top_neg_class,
            "top_neg_score": round(top_neg_score, 4),
            "top_persona_class": top_p_class,
            "top_persona_score": round(top_p_score, 4),
            "server_room_score": round(top_sr_score, 4),
            "top_generic_score": round(top_gen_score, 4),
            "specificity_margin": round(specificity_margin, 4),
            "neg_scores": {k: round(v, 4) for k, v in neg_scores.items()},
        }

        # 1. Competencia zero-shot: gana una clase negativa
        if top_neg_score >= sim_pos:
            return False, f"negativa_ganadora:{top_neg_class} ({top_neg_score:.3f} >= {sim_pos:.3f})", sim_pos, diag

        # 2. Persona identificable / rostro con umbral calibrado
        if top_p_score >= DEFAULT_PERSON_THRESHOLD:
            return False, f"persona_detectada:{top_p_class} ({top_p_score:.3f} >= {DEFAULT_PERSON_THRESHOLD:.3f})", sim_pos, diag

        # 3. Sala de servidores en tema que no es de infraestructura
        if not is_infra and top_sr_score >= sim_pos:
            return False, f"sala_de_servidores_inapropiada ({top_sr_score:.3f} >= {sim_pos:.3f})", sim_pos, diag

        if not is_infra and top_sr_score >= DEFAULT_STRONG_NEGATIVE_THRESHOLD:
            return False, f"fuerte_sala_de_servidores ({top_sr_score:.3f} >= {DEFAULT_STRONG_NEGATIVE_THRESHOLD:.3f})", sim_pos, diag

        # 4. Fuerte presencia de clase negativa general
        if top_neg_score >= DEFAULT_STRONG_NEGATIVE_THRESHOLD:
            return False, f"fuerte_negativa:{top_neg_class} ({top_neg_score:.3f} >= {DEFAULT_STRONG_NEGATIVE_THRESHOLD:.3f})", sim_pos, diag

        # 5. Margen de especificidad
        if specificity_margin < DEFAULT_SPECIFICITY_MARGIN:
            return False, f"especificidad_insuficiente (pos={sim_pos:.3f} vs gen={top_gen_score:.3f})", sim_pos, diag

        # 6. Umbral mínimo
        if sim_pos < min_similarity:
            return False, f"umbral_minimo ({sim_pos:.3f} < {min_similarity:.3f})", sim_pos, diag

        return True, "aprobada", sim_pos, diag
