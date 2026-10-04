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

NEGATIVE_CLASSES: dict[str, str] = {
    "persona": "an identifiable person, portrait of a person, human face or group of people",
    "militar": "military soldiers in uniform, armed forces, military badge, coat of arms, or military shield",
    "poster_texto": "poster or flyer with a lot of text, awareness campaign poster, typography banner with words",
    "screenshot": "computer screenshot, software user interface window, operating system desktop, code terminal",
    "meme": "internet meme, humorous graphic with impact font captions",
}


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

            # Precomputar embeddings normalizados de clases negativas
            neg_texts = list(NEGATIVE_CLASSES.values())
            tokens = self.tokenizer(neg_texts).to(self.device)
            with torch.no_grad():
                embs = self.model.encode_text(tokens)
                self.negative_embeddings = embs / embs.norm(dim=-1, keepdim=True)

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

        # Construir prompt positivo combinando concepto, consulta y descripción técnica
        pos_prompt = f"a technical photo or diagram of {concept}. {query}. {description}".strip()
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

            try:
                img_tensor = self.preprocess(pil_img).unsqueeze(0).to(self.device)
                with torch.no_grad():
                    img_emb = self.model.encode_image(img_tensor)
                    img_emb = img_emb / img_emb.norm(dim=-1, keepdim=True)

                    sim_pos = float((img_emb @ pos_emb.T).item())
                    sim_negs = (img_emb @ self.negative_embeddings.T).squeeze(0).tolist()

                neg_scores = dict(zip(neg_names, sim_negs, strict=False))
                top_neg_class, top_neg_score = max(neg_scores.items(), key=lambda item: item[1])

                # Reglas de descarte:
                discard_reason = None

                # 1. Competencia zero-shot: gana una clase negativa
                if top_neg_score >= sim_pos:
                    discard_reason = f"negativa_ganadora:{top_neg_class} ({top_neg_score:.3f} >= {sim_pos:.3f})"
                # 2. Presencia negativa dominante (persona identificable, militar, póster con texto)
                elif top_neg_score >= DEFAULT_STRONG_NEGATIVE_THRESHOLD:
                    discard_reason = f"fuerte_negativa:{top_neg_class} ({top_neg_score:.3f} >= {DEFAULT_STRONG_NEGATIVE_THRESHOLD:.3f})"
                # 3. Umbral mínimo de similitud positiva
                elif sim_pos < min_similarity:
                    discard_reason = f"umbral_minimo ({sim_pos:.3f} < {min_similarity:.3f})"

                diag = {
                    "title": title,
                    "url": url,
                    "pos_score": round(sim_pos, 4),
                    "top_neg_class": top_neg_class,
                    "top_neg_score": round(top_neg_score, 4),
                    "neg_scores": {k: round(v, 4) for k, v in neg_scores.items()},
                    "passed": discard_reason is None,
                    "reason": discard_reason or "aprobado",
                }
                diagnostics.append(diag)

                if discard_reason is None:
                    # Guardamos la imagen precargada en la candidata para ahorrar re-descarga
                    c_with_score = dict(c)
                    c_with_score["clip_score"] = sim_pos
                    c_with_score["clip_top_neg"] = top_neg_class
                    c_with_score["clip_top_neg_score"] = top_neg_score
                    c_with_score["_downloaded_bytes"] = resp.content
                    accepted_candidates.append((sim_pos, c_with_score))

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
