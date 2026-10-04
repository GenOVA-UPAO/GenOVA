"""Script de evaluación honesta y generación de hoja de contactos para temas de CS.

Iteración 2:
- Peticiones 'imagen' generadas dinámicamente por el LLM local (qwen3:8b) sobre plantillas reales.
- Admite argumento CLI `--temas <archivo.json>` para evaluación con conjunto ciego (heldout).
- Hoja de contactos HTML con todas las imágenes cargadas de inmediato (sin lazy-loading).
- Muestra puntuación CLIP, candidatos descartados y motivos de descarte por clases negativas.
- Crédito real completo (autor, licencia con enlace, proveedor).
- Columna 'Relevante (revisión humana)' dejada vacía para el evaluador humano.
- Métricas objetivas en out/imagenes-busqueda/v2/metrics.json y hoja de contactos en contact_sheet.html.
"""

from __future__ import annotations

import argparse
import copy
import html
import json
import os
import sys
import time
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from llm.images.image_enrich import format_credit_caption
from llm.images.image_placeholder import resolve_image_placeholders
from llm.images.sources.contract import ImageRequest
from llm.images.sources.router import ImageRouter
from ova_engine.decision import decide
from ova_engine.pipeline import render_resource
from ova_engine.registry import get_spec
from ova_engine.text import generate_json

DEFAULT_IMAGE_TEMPLATES = [
    ("explain", 2),   # Lectura Guiada
    ("explain", 8),   # Diagrama de Framework
    ("explain", 9),   # Tabla Comparativa
    ("explain", 6),   # Glosario Visual
    ("explain", 10),  # Infografía Interactiva
    ("elaborate", 1), # Estudio de Caso
    ("explore", 5),   # Lectura Interactiva
    ("elaborate", 3), # Mini-Proyecto
    ("engage", 6),    # Noticia de Impacto
    ("engage", 5),    # Dilema Ético
]

DEFAULT_CS_TOPICS = [
    {
        "id": "topic_01",
        "concept": "Bases de datos relacionales con PostgreSQL",
        "template": ("explain", 2),
    },
    {
        "id": "topic_02",
        "concept": "Orquestación de contenedores con Kubernetes",
        "template": ("explain", 8),
    },
    {
        "id": "topic_03",
        "concept": "Contenedores y aislamiento con Docker",
        "template": ("explain", 9),
    },
    {
        "id": "topic_04",
        "concept": "Almacenamiento en memoria con Redis",
        "template": ("explain", 6),
    },
    {
        "id": "topic_05",
        "concept": "Bases de datos NoSQL con MongoDB",
        "template": ("explain", 10),
    },
    {
        "id": "topic_06",
        "concept": "Procesamiento distribuido con Apache Kafka",
        "template": ("elaborate", 1),
    },
    {
        "id": "topic_07",
        "concept": "Sistemas operativos y Kernel Linux",
        "template": ("explore", 5),
    },
    {
        "id": "topic_08",
        "concept": "Control de versiones distribuido con Git",
        "template": ("elaborate", 3),
    },
    {
        "id": "topic_09",
        "concept": "Desarrollo de software con Python",
        "template": ("explain", 2),
    },
    {
        "id": "topic_10",
        "concept": "Servidores web y proxy inverso con Nginx",
        "template": ("explain", 8),
    },
    {
        "id": "topic_11",
        "concept": "Centros de datos y servidores de alta densidad",
        "template": ("engage", 6),
    },
    {
        "id": "topic_12",
        "concept": "Ciberseguridad y cifrado de datos en reposo",
        "template": ("engage", 5),
    },
    {
        "id": "topic_13",
        "concept": "Redes de computadoras y cableado de fibra óptica",
        "template": ("explore", 5),
    },
    {
        "id": "topic_14",
        "concept": "Arquitectura de computadoras y circuitos integrados",
        "template": ("explain", 10),
    },
    {
        "id": "topic_15",
        "concept": "Infraestructura cloud y virtualización empresarial",
        "template": ("elaborate", 1),
    },
    {
        "id": "topic_16",
        "concept": "Monitoreo operativo y observabilidad de sistemas",
        "template": ("explore", 5),
    },
    {
        "id": "topic_17",
        "concept": "Supercómputo y clusters de GPU para IA",
        "template": ("engage", 6),
    },
    {
        "id": "topic_18",
        "concept": "Cumplimiento normativo y auditoría de bases de datos",
        "template": ("engage", 5),
    },
    {
        "id": "topic_19",
        "concept": "Arreglos de discos RAID y almacenamiento masivo",
        "template": ("elaborate", 3),
    },
    {
        "id": "topic_20",
        "concept": "Infraestructura de telecomunicaciones y switches",
        "template": ("explain", 6),
    },
]


def load_topics(temas_path: str | None) -> list[dict[str, Any]]:
    """Carga los temas desde archivo JSON o usa los 20 temas de CS por defecto.

    Soporta formato lista de strings ['Tema 1', ...] o lista de dicts [{'concept': '...'}, ...].
    """
    if not temas_path:
        return copy.deepcopy(DEFAULT_CS_TOPICS)

    with open(temas_path, encoding="utf-8") as f:
        raw = json.load(f)

    if not isinstance(raw, list):
        raise ValueError(f"El archivo {temas_path} debe contener una lista JSON de temas.")

    topics: list[dict[str, Any]] = []
    for idx, item in enumerate(raw, 1):
        tid = f"topic_{idx:02d}"
        if isinstance(item, str):
            concept = item.strip()
            template = DEFAULT_IMAGE_TEMPLATES[(idx - 1) % len(DEFAULT_IMAGE_TEMPLATES)]
            topics.append({"id": tid, "concept": concept, "template": template})
        elif isinstance(item, dict):
            concept = (
                item.get("concept")
                or item.get("concepto")
                or item.get("topic")
                or item.get("tema")
                or item.get("title")
                or f"Tema {idx}"
            ).strip()
            template_val = item.get("template")
            if template_val:
                if isinstance(template_val, (list, tuple)) and len(template_val) == 2:
                    template = (str(template_val[0]), int(template_val[1]))
                elif isinstance(template_val, str) and ":" in template_val:
                    p, r = template_val.split(":", 1)
                    template = (p, int(r))
                else:
                    template = DEFAULT_IMAGE_TEMPLATES[(idx - 1) % len(DEFAULT_IMAGE_TEMPLATES)]
            else:
                template = DEFAULT_IMAGE_TEMPLATES[(idx - 1) % len(DEFAULT_IMAGE_TEMPLATES)]
            topics.append({
                "id": item.get("id") or tid,
                "concept": concept,
                "template": template,
            })
    return topics


def generate_llm_template_content(spec: Any, concept: str) -> tuple[dict[str, Any], float]:
    """Genera el contenido real de la plantilla invocando el LLM local (qwen3:8b).

    Fuerza que el campo 'imagen' esté presente en el schema para evaluar las
    peticiones de imagen generadas de forma autónoma por el modelo.
    """
    params = decide(spec, concept, "")
    schema = copy.deepcopy(spec.schema(params))

    # Asegurar que el LLM genere la petición de imagen si la plantilla la soporta
    if "imagen" in schema.get("properties", {}):
        req_props = list(schema.get("required", []))
        if "imagen" not in req_props:
            req_props.append("imagen")
        schema["required"] = req_props

    prompt = spec.prompt(concept, "", params)

    t0 = time.time()
    data = generate_json(prompt, schema)
    elapsed_ms = round((time.time() - t0) * 1000, 1)

    return data, elapsed_ms


def main():
    parser = argparse.ArgumentParser(description="Evaluación honesta de fuentes de imágenes con CLIP local y plantillas reales.")
    parser.add_argument(
        "--temas",
        type=str,
        default=None,
        help="Ruta al archivo JSON con lista de temas (opcional, por defecto 20 temas de CS).",
    )
    parser.add_argument(
        "--out-dir",
        type=str,
        default="/home/jeffryru/github/genova-orquestacion/out/imagenes-busqueda/v2",
        help="Directorio de salida para la hoja de contactos, métricas y muestras.",
    )
    parser.add_argument(
        "--no-samples",
        action="store_true",
        help="Omite la generación de muestras HTML completas de las plantillas.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Límite opcional de temas a evaluar (para pruebas rápidas).",
    )

    args = parser.parse_args()

    os.environ["OVA_TEXT_BACKEND"] = "local"
    out_dir = args.out_dir
    samples_dir = os.path.join(out_dir, "samples")
    os.makedirs(out_dir, exist_ok=True)
    if not args.no_samples:
        os.makedirs(samples_dir, exist_ok=True)

    topics = load_topics(args.temas)
    if args.limit and args.limit > 0:
        topics = topics[:args.limit]

    router = ImageRouter()
    results: list[dict[str, Any]] = []

    print("=== INICIANDO EVALUACIÓN HONESTA DE IMÁGENES (Iteración 2) ===")
    print(f"Temas a evaluar: {len(topics)}")
    print(f"Directorio de salida: {out_dir}")
    print("Backend LLM: local (Ollama/llama-server qwen3:8b)")
    print("Re-ranking: local CLIP ViT-B-32 (clases negativas zero-shot activas)")
    print("=" * 65)

    all_clip_evals: list[dict[str, Any]] = []

    for i, item in enumerate(topics, 1):
        concept = item["concept"]
        phase, rt = item["template"]
        spec = get_spec(phase, rt)
        template_title = spec.title if spec else f"{phase}:{rt}"
        template_key = spec.key if spec else f"{phase}:{rt}"

        print(f"\n[{i:02d}/{len(topics)}] Tema: «{concept}»")
        print(f"     Plantilla: {template_key} ({template_title})")

        # 1. Generación de contenido real mediante el LLM local
        print("     [1/3] Generando contenido con LLM local...", end="", flush=True)
        data = {}
        llm_latency_ms = 0.0
        try:
            data, llm_latency_ms = generate_llm_template_content(spec, concept)
            print(f" OK ({llm_latency_ms} ms)")
        except Exception as exc:
            print(f" ERROR: {exc}")

        # 2. Extracción de la petición de imagen generada por el LLM
        raw_image_req = data.get("imagen")
        if isinstance(raw_image_req, dict) and (raw_image_req.get("consulta") or raw_image_req.get("marca") or raw_image_req.get("tipo")):
            req = ImageRequest.from_json(raw_image_req, concept=concept, template_key=template_key)
            llm_request_summary = {
                "tipo": req.tipo,
                "marca": req.marca or "",
                "consulta": req.consulta or "",
                "descripcion": req.descripcion or "",
            }
        else:
            # Fallback seguro con metadatos del concepto
            req = ImageRequest(
                tipo="foto",
                concept=concept,
                consulta=concept,
                descripcion=concept,
                template_key=template_key,
            )
            llm_request_summary = {
                "tipo": "foto (inferido)",
                "marca": "",
                "consulta": concept,
                "descripcion": concept,
            }

        print(f"     [2/3] Petición LLM: tipo={llm_request_summary['tipo']}, marca='{llm_request_summary['marca']}', consulta='{llm_request_summary['consulta']}'")

        # 3. Enrutamiento y evaluación visual con CLIP
        print("     [3/3] Enrutando y evaluando con CLIP...", end="", flush=True)
        t_img0 = time.time()
        res = router.route(req)
        img_latency_ms = round((time.time() - t_img0) * 1000, 1)

        source = res.source if res else "ninguna"
        provider = (res.meta.get("provider") if res else "") or ""
        clip_score = res.meta.get("clip_score") if res else None

        # Diagnósticos de candidatos evaluados y descartados por CLIP
        raw_diags = (
            getattr(router.search_source, "last_diagnostics", [])
            or (res.meta.get("clip_diagnostics", []) if res else [])
        )
        diagnostics = copy.deepcopy(raw_diags)
        all_clip_evals.extend(diagnostics)

        num_passed = sum(1 for d in diagnostics if d.get("passed"))
        num_discarded = len(diagnostics) - num_passed

        print(f" OK -> Fuente: {source.upper()} ({img_latency_ms} ms)")
        if clip_score is not None:
            print(f"           Puntuación CLIP: {clip_score:.3f}")
        if diagnostics:
            print(f"           Candidatas: {len(diagnostics)} evaluadas ({num_passed} aprobadas, {num_discarded} descartadas)")

        # 4. Renderizado opcional de la muestra completa
        if not args.no_samples and spec and res:
            try:
                sample_data = copy.deepcopy(data)
                params = decide(spec, concept, "")
                sample_data["image_placeholder"] = res.data_uri
                sample_data["image_credit"] = res.credit
                sample_data["image_credit_html"] = format_credit_caption(res.credit)
                sample_data["image_source"] = res.source
                sample_data["image_alt"] = res.alt

                html_out = render_resource(spec, sample_data, concept, params)
                html_out = resolve_image_placeholders(html_out, {"IMG_PLACEHOLDER": res.data_uri})
                sample_filename = f"{item['id']}_{spec.phase}_{spec.rt}.html"
                with open(os.path.join(samples_dir, sample_filename), "w", encoding="utf-8") as f:
                    f.write(html_out)
            except Exception as e:
                print(f"           Aviso renderizando muestra: {e}")

        total_latency_ms = round(llm_latency_ms + img_latency_ms, 1)

        rec = {
            "id": item["id"],
            "concept": concept,
            "template": f"{phase}:{rt} ({template_title})",
            "template_key": template_key,
            "llm_request": llm_request_summary,
            "source": source,
            "provider": provider,
            "author": getattr(res.credit, "author", "") if (res and res.credit) else "",
            "license": getattr(res.credit, "license", "") if (res and res.credit) else ("Libre / MIT" if source == "logo" else "N/A"),
            "license_url": getattr(res.credit, "license_url", "") if (res and res.credit) else "",
            "source_url": getattr(res.credit, "source_url", "") if (res and res.credit) else "",
            "clip_score": clip_score,
            "candidates_evaluated": len(diagnostics),
            "candidates_passed": num_passed,
            "candidates_discarded": num_discarded,
            "discarded_details": [
                {
                    "title": d.get("title", ""),
                    "pos_score": d.get("pos_score", 0.0),
                    "top_neg_class": d.get("top_neg_class", ""),
                    "top_neg_score": d.get("top_neg_score", 0.0),
                    "reason": d.get("reason", ""),
                }
                for d in diagnostics
                if not d.get("passed")
            ],
            "latencies": {
                "llm_ms": llm_latency_ms,
                "image_ms": img_latency_ms,
                "total_ms": total_latency_ms,
            },
            "data_uri": res.data_uri if res else "",
            "alt": res.alt if res else "",
            # Columna de evaluación humana explícitamente vacía para el revisor
            "relevante_revision_humana": "",
        }
        results.append(rec)

    # Cálculo de métricas objetivas agregadas
    total = len(results)
    con_imagen = sum(1 for r in results if r["source"] in ("logo", "busqueda", "generada"))
    sin_imagen = total - con_imagen

    source_counts: dict[str, int] = {}
    for r in results:
        src = r["source"]
        source_counts[src] = source_counts.get(src, 0) + 1

    total_candidates_eval = len(all_clip_evals)
    total_candidates_passed = sum(1 for d in all_clip_evals if d.get("passed"))
    total_candidates_discarded = total_candidates_eval - total_candidates_passed

    discard_reasons_summary: dict[str, int] = {}
    for d in all_clip_evals:
        if not d.get("passed"):
            r = d.get("reason") or "desconocido"
            prefix = r.split(":")[0].split(" ")[0]
            discard_reasons_summary[prefix] = discard_reasons_summary.get(prefix, 0) + 1

    avg_total_lat = round(sum(r["latencies"]["total_ms"] for r in results) / total, 1) if total else 0.0
    avg_llm_lat = round(sum(r["latencies"]["llm_ms"] for r in results) / total, 1) if total else 0.0
    avg_img_lat = round(sum(r["latencies"]["image_ms"] for r in results) / total, 1) if total else 0.0

    metrics = {
        "resumen_general": {
            "total_temas": total,
            "con_imagen": con_imagen,
            "sin_imagen": sin_imagen,
            "cobertura_pct": round((con_imagen / total) * 100, 1) if total else 0.0,
            "costo_total_usd": 0.00,
        },
        "distribucion_fuentes": {
            src: {
                "count": count,
                "pct": round((count / total) * 100, 1) if total else 0.0,
            }
            for src, count in source_counts.items()
        },
        "metricas_clip_reranking": {
            "total_candidatas_evaluadas": total_candidates_eval,
            "total_candidatas_aprobadas": total_candidates_passed,
            "total_candidatas_descartadas": total_candidates_discarded,
            "tasa_descarte_clip_pct": round((total_candidates_discarded / total_candidates_eval) * 100, 1) if total_candidates_eval else 0.0,
            "descartes_por_motivo": discard_reasons_summary,
        },
        "latencias_promedio_ms": {
            "llm_ms": avg_llm_lat,
            "imagen_ms": avg_img_lat,
            "total_ms": avg_total_lat,
        },
        "resultados": [
            {k: v for k, v in r.items() if k != "data_uri"}
            for r in results
        ],
    }

    metrics_path = os.path.join(out_dir, "metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, ensure_ascii=False)

    # Generación de la Hoja de Contactos HTML SIN lazy loading
    contact_cards_html = []
    for r in results:
        source_cls = {
            "logo": "badge-logo",
            "busqueda": "badge-search",
            "ninguna": "badge-none",
        }.get(r["source"], "badge-none")

        if r["data_uri"]:
            img_tag = f'<img src="{r["data_uri"]}" alt="{html.escape(r["concept"])}" class="item-img">'
        else:
            img_tag = '<div class="no-img-box"><span class="no-img-icon">⚠️</span><span>Sin imagen (descartada por umbral o clases negativas CLIP)</span></div>'

        # Candidatas descartadas
        discarded_html = ""
        if r["discarded_details"]:
            rows = []
            for d in r["discarded_details"][:6]:  # Mostrar hasta 6 en la tarjeta
                rows.append(
                    f"<tr>"
                    f"<td>{html.escape(d['title'][:40])}</td>"
                    f"<td>{d['pos_score']:.3f}</td>"
                    f"<td>{d['top_neg_class'] or '-'} ({d['top_neg_score']:.3f})</td>"
                    f"<td><span class='reason-tag'>{html.escape(d['reason'])}</span></td>"
                    f"</tr>"
                )
            discarded_html = f"""
            <details class="discarded-details">
              <summary>Candidatas descartadas ({len(r['discarded_details'])})</summary>
              <table class="discarded-table">
                <thead>
                  <tr><th>Candidata</th><th>CLIP+</th><th>Clase Neg</th><th>Motivo</th></tr>
                </thead>
                <tbody>
                  {"".join(rows)}
                </tbody>
              </table>
            </details>
            """

        score_text = f"{r['clip_score']:.3f}" if r["clip_score"] is not None else "N/A"
        credit_link = (
            f'<a href="{html.escape(r["license_url"])}" target="_blank" rel="noopener">{html.escape(r["license"])}</a>'
            if r["license_url"]
            else html.escape(r["license"])
        )
        source_link = (
            f'<a href="{html.escape(r["source_url"])}" target="_blank" rel="noopener">{html.escape(r["provider"] or r["source"])}</a>'
            if r["source_url"]
            else html.escape(r["provider"] or r["source"])
        )

        contact_cards_html.append(f"""
        <div class="card">
          <div class="card-img-wrap">
            {img_tag}
          </div>
          <div class="card-body">
            <div class="badge-row">
              <span class="badge {source_cls}">{r["source"].upper()}</span>
              <span class="badge badge-template">{html.escape(r["template"])}</span>
              <span class="badge badge-score">CLIP: {score_text}</span>
            </div>
            <h3 class="card-title">{html.escape(r["concept"])}</h3>
            <div class="req-box">
              <strong>Petición generada por LLM:</strong>
              <div>Tipo: <code>{html.escape(r['llm_request']['tipo'])}</code> · Marca: <code>{html.escape(r['llm_request']['marca'] or 'N/A')}</code></div>
              <div>Consulta: <em>«{html.escape(r['llm_request']['consulta'])}»</em></div>
            </div>
            <div class="card-meta">
              <strong>Atribución:</strong> {html.escape(r["author"] or "N/A")} · {credit_link} · {source_link}
            </div>
            <div class="card-meta">
              <strong>Latencias:</strong> Total: {r["latencies"]["total_ms"]} ms (LLM: {r["latencies"]["llm_ms"]} ms · Imagen: {r["latencies"]["image_ms"]} ms)
            </div>
            {discarded_html}
            <div class="human-review-box">
              <span class="review-label">Relevante (revisión humana):</span>
              <span class="review-blank">[ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]</span>
            </div>
          </div>
        </div>
        """)

    sheet_html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Hoja de Contactos — Búsqueda de Imágenes y Logos V2 (Génova)</title>
  <style>
    :root {{
      --primary: #0A3D91;
      --bg: #F8FAFC;
      --surface: #FFFFFF;
      --border: #E2E8F0;
      --text: #1E293B;
      --text-muted: #64748B;
      --success: #16A34A;
      --warning: #D97706;
      --danger: #DC2626;
      --accent: #2563EB;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 32px 24px;
    }}
    .container {{
      max-width: 1440px;
      margin: 0 auto;
    }}
    header {{
      margin-bottom: 28px;
      border-bottom: 2px solid var(--border);
      padding-bottom: 20px;
    }}
    h1 {{
      color: var(--primary);
      margin: 0 0 8px;
      font-size: 1.8rem;
    }}
    header p {{
      color: var(--text-muted);
      margin: 4px 0 0;
      font-size: 0.95rem;
    }}
    .stats-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin: 24px 0 32px;
    }}
    .stat-card {{
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }}
    .stat-lbl {{
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 600;
    }}
    .stat-val {{
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--primary);
      margin-top: 6px;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 24px;
    }}
    .card {{
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    }}
    .card-img-wrap {{
      height: 220px;
      background: #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      border-bottom: 1px solid var(--border);
    }}
    .item-img {{
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }}
    .no-img-box {{
      text-align: center;
      color: var(--warning);
      padding: 16px;
      font-size: 0.85rem;
      font-weight: 500;
    }}
    .no-img-icon {{
      display: block;
      font-size: 2rem;
      margin-bottom: 6px;
    }}
    .card-body {{
      padding: 16px;
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 8px;
    }}
    .badge-row {{
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }}
    .badge {{
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }}
    .badge-logo {{ background: #E0E7FF; color: #3730A3; }}
    .badge-search {{ background: #DCFCE7; color: #166534; }}
    .badge-none {{ background: #FEE2E2; color: #991B1B; }}
    .badge-template {{ background: #F1F5F9; color: var(--text-muted); }}
    .badge-score {{ background: #FEF3C7; color: #92400E; }}
    .card-title {{
      margin: 4px 0 0;
      font-size: 1.05rem;
      color: var(--primary);
    }}
    .req-box {{
      background: #F8FAFC;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 0.8rem;
      line-height: 1.4;
      color: var(--text);
    }}
    .req-box code {{
      background: #E2E8F0;
      padding: 1px 4px;
      border-radius: 4px;
      font-size: 0.75rem;
    }}
    .card-meta {{
      font-size: 0.8rem;
      color: var(--text-muted);
      line-height: 1.4;
    }}
    .card-meta a {{
      color: var(--accent);
      text-decoration: none;
    }}
    .card-meta a:hover {{
      text-decoration: underline;
    }}
    .discarded-details {{
      font-size: 0.78rem;
      margin-top: 4px;
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 6px;
      padding: 6px 10px;
    }}
    .discarded-details summary {{
      cursor: pointer;
      font-weight: 600;
      color: #92400E;
    }}
    .discarded-table {{
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 0.72rem;
    }}
    .discarded-table th, .discarded-table td {{
      padding: 4px 6px;
      border-bottom: 1px solid #FEF3C7;
      text-align: left;
    }}
    .reason-tag {{
      display: inline-block;
      color: #B45309;
      font-weight: 500;
    }}
    .human-review-box {{
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px dashed var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.85rem;
    }}
    .review-label {{
      font-weight: 600;
      color: var(--primary);
    }}
    .review-blank {{
      font-family: monospace;
      font-size: 1rem;
      color: #CBD5E1;
      border: 1px solid #CBD5E1;
      padding: 2px 12px;
      border-radius: 4px;
      background: #FFFFFF;
    }}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Hoja de Contactos — Evaluación de Fuentes de Imagen V2</h1>
      <p>Evaluación con peticiones 'imagen' generadas por LLM local (qwen3:8b) sobre plantillas reales UPAO y re-ranking visual con CLIP ViT-B-32 (clases negativas zero-shot).</p>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-lbl">Temas Evaluados</div>
        <div class="stat-val">{total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Cobertura con Imagen</div>
        <div class="stat-val" style="color:var(--success)">{metrics['resumen_general']['cobertura_pct']}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Distribución de Fuentes</div>
        <div class="stat-val" style="font-size:1.15rem;margin-top:8px">
          Logos: {metrics['distribucion_fuentes'].get('logo', {}).get('pct', 0)}% · Web: {metrics['distribucion_fuentes'].get('busqueda', {}).get('pct', 0)}% · Sin img: {metrics['distribucion_fuentes'].get('ninguna', {}).get('pct', 0)}%
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Candidatas Descartadas (CLIP)</div>
        <div class="stat-val" style="color:var(--warning)">
          {total_candidates_discarded} / {total_candidates_eval}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Latencia Promedio Total</div>
        <div class="stat-val">{avg_total_lat} <span style="font-size:0.9rem;color:var(--text-muted)">ms</span></div>
      </div>
    </div>

    <h2>Resultados Detallados por Tema ({total})</h2>
    <div class="grid">
      {"".join(contact_cards_html)}
    </div>
  </div>
</body>
</html>
"""

    sheet_path = os.path.join(out_dir, "contact_sheet.html")
    with open(sheet_path, "w", encoding="utf-8") as f:
        f.write(sheet_html)

    print("\n" + "=" * 65)
    print("EVALUACIÓN COMPLETADA EXITOSAMENTE")
    print(f"Métricas JSON:     {metrics_path}")
    print(f"Hoja de Contactos: {sheet_path}")
    if not args.no_samples:
        print(f"Muestras OVA:      {samples_dir}")
    print("=" * 65)


if __name__ == "__main__":
    main()
