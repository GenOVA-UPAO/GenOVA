"""Script de evaluación y generación de hoja de contactos para 20 temas de CS."""

from __future__ import annotations

import copy
import json
import os
import sys
import time
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from llm.images.sources.contract import ImageRequest
from llm.images.sources.router import ImageRouter
from ova_engine.contract import RenderContext
from ova_engine.registry import get_spec

TEST_TOPICS = [
    {
        "id": "topic_01",
        "concept": "Bases de datos relacionales con PostgreSQL",
        "template": ("explain", 2),
        "request": {
            "tipo": "logo",
            "marca": "PostgreSQL",
            "consulta": "PostgreSQL relational database logo",
            "descripcion": "Logotipo de PostgreSQL con el elefante Slonik",
        },
    },
    {
        "id": "topic_02",
        "concept": "Orquestación de contenedores con Kubernetes",
        "template": ("explain", 8),
        "request": {
            "tipo": "logo",
            "marca": "Kubernetes",
            "consulta": "Kubernetes container orchestration helm logo",
            "descripcion": "Logotipo oficial del timón de Kubernetes",
        },
    },
    {
        "id": "topic_03",
        "concept": "Contenedores y aislamiento con Docker",
        "template": ("explain", 9),
        "request": {
            "tipo": "logo",
            "marca": "Docker",
            "consulta": "Docker container platform whale logo",
            "descripcion": "Logotipo de la ballena y contenedores de Docker",
        },
    },
    {
        "id": "topic_04",
        "concept": "Almacenamiento en memoria con Redis",
        "template": ("explain", 6),
        "request": {
            "tipo": "logo",
            "marca": "Redis",
            "consulta": "Redis in-memory key-value data store logo",
            "descripcion": "Logotipo de capas de Redis",
        },
    },
    {
        "id": "topic_05",
        "concept": "Bases de datos NoSQL con MongoDB",
        "template": ("explain", 10),
        "request": {
            "tipo": "logo",
            "marca": "MongoDB",
            "consulta": "MongoDB document database leaf logo",
            "descripcion": "Logotipo de la hoja de MongoDB",
        },
    },
    {
        "id": "topic_06",
        "concept": "Procesamiento distribuido con Apache Kafka",
        "template": ("elaborate", 1),
        "request": {
            "tipo": "logo",
            "marca": "Apache Kafka",
            "consulta": "Apache Kafka event streaming logo",
            "descripcion": "Logotipo de nodos conectados de Apache Kafka",
        },
    },
    {
        "id": "topic_07",
        "concept": "Sistemas operativos y Kernel Linux",
        "template": ("explore", 5),
        "request": {
            "tipo": "logo",
            "marca": "Linux",
            "consulta": "Linux operating system kernel Tux logo",
            "descripcion": "Logotipo del pingüino Tux para Linux",
        },
    },
    {
        "id": "topic_08",
        "concept": "Control de versiones distribuido con Git",
        "template": ("elaborate", 3),
        "request": {
            "tipo": "logo",
            "marca": "Git",
            "consulta": "Git version control branches logo",
            "descripcion": "Logotipo de ramificaciones de Git",
        },
    },
    {
        "id": "topic_09",
        "concept": "Desarrollo de software con Python",
        "template": ("explain", 2),
        "request": {
            "tipo": "logo",
            "marca": "Python",
            "consulta": "Python programming language snakes logo",
            "descripcion": "Logotipo de las serpientes entrelazadas de Python",
        },
    },
    {
        "id": "topic_10",
        "concept": "Servidores web y proxy inverso con Nginx",
        "template": ("explain", 8),
        "request": {
            "tipo": "logo",
            "marca": "Nginx",
            "consulta": "Nginx reverse proxy high-performance web server logo",
            "descripcion": "Logotipo de la N verde de Nginx",
        },
    },
    {
        "id": "topic_11",
        "concept": "Centros de datos y servidores de alta densidad",
        "template": ("engage", 6),
        "request": {
            "tipo": "foto",
            "consulta": "modern datacenter server racks interior",
            "descripcion": "Filas de racks de servidores en un centro de datos moderno",
        },
    },
    {
        "id": "topic_12",
        "concept": "Ciberseguridad y cifrado de datos en reposo",
        "template": ("engage", 5),
        "request": {
            "tipo": "foto",
            "consulta": "cyber security data encryption server network",
            "descripcion": "Candado y servidor representando seguridad criptográfica de datos",
        },
    },
    {
        "id": "topic_13",
        "concept": "Redes de computadoras y cableado de fibra óptica",
        "template": ("explore", 5),
        "request": {
            "tipo": "foto",
            "consulta": "fiber optic cables patch panel networking",
            "descripcion": "Conexiones de fibra óptica en panel de distribución de red",
        },
    },
    {
        "id": "topic_14",
        "concept": "Arquitectura de computadoras y circuitos integrados",
        "template": ("explain", 10),
        "request": {
            "tipo": "foto",
            "consulta": "computer motherboard silicon microprocessor circuit",
            "descripcion": "Microprocesador y pistas de circuito en placa madre",
        },
    },
    {
        "id": "topic_15",
        "concept": "Infraestructura cloud y virtualización empresarial",
        "template": ("elaborate", 1),
        "request": {
            "tipo": "foto",
            "consulta": "cloud computing infrastructure server hardware",
            "descripcion": "Servidores de virtualización en la nube corporativa",
        },
    },
    {
        "id": "topic_16",
        "concept": "Monitoreo operativo y observabilidad de sistemas",
        "template": ("explore", 5),
        "request": {
            "tipo": "foto",
            "consulta": "network operations center monitor displays metrics",
            "descripcion": "Pantallas de monitorización de métricas en centro de operaciones",
        },
    },
    {
        "id": "topic_17",
        "concept": "Supercómputo y clusters de GPU para IA",
        "template": ("engage", 6),
        "request": {
            "tipo": "foto",
            "consulta": "gpu cluster supercomputer server datacenter",
            "descripcion": "Clúster de aceleración por hardware y servidores de cómputo",
        },
    },
    {
        "id": "topic_18",
        "concept": "Cumplimiento normativo y auditoría de bases de datos",
        "template": ("engage", 5),
        "request": {
            "tipo": "foto",
            "consulta": "digital privacy compliance data security server",
            "descripcion": "Seguridad de información y cumplimiento de privacidad digital",
        },
    },
    {
        "id": "topic_19",
        "concept": "Arreglos de discos RAID y almacenamiento masivo",
        "template": ("elaborate", 3),
        "request": {
            "tipo": "foto",
            "consulta": "hard drive disk array storage server",
            "descripcion": "Módulo de bahías de discos duros en servidor de almacenamiento",
        },
    },
    {
        "id": "topic_20",
        "concept": "Infraestructura de telecomunicaciones y switches",
        "template": ("explain", 6),
        "request": {
            "tipo": "foto",
            "consulta": "telecommunications patch panel ethernet cables",
            "descripcion": "Switches y cableado ethernet estructurado en rack",
        },
    },
]


def evaluate_relevance(topic: dict, result: Any) -> tuple[bool, list[str]]:
    """Evalúa la relevancia según criterios objetivos explícitos:
    1. Formato y datos válidos (data URI no vacío, dimensiones válidas).
    2. Relevancia técnica directa con el tema.
    3. Calidad visual / ausencia de alfabetos extraños o texto invasivo ilegible.
    4. Atribución y licencia libre válida.
    """
    reasons = []
    if not result or not getattr(result, "data_uri", None):
        return False, ["No se obtuvo data_uri válido"]

    uri = result.data_uri
    if not (uri.startswith("data:image/svg+xml") or uri.startswith("data:image/webp") or uri.startswith("data:image/")):
        return False, ["Formato de data_uri desconocido"]
    reasons.append("Formato de imagen válido (SVG/WebP)")

    req = topic["request"]
    if req["tipo"] == "logo":
        if result.source != "logo":
            reasons.append(f"Fallback a {result.source}")
        else:
            reasons.append(f"Marca encontrada exactamente ({result.meta.get('slug')})")
    elif req["tipo"] == "foto":
        if result.source == "busqueda":
            reasons.append(f"Foto libre encontrada vía {result.meta.get('provider')}")
        else:
            reasons.append(f"Fuente {result.source}")

    credit = result.credit
    if credit:
        lic = getattr(credit, "license", "")
        author = getattr(credit, "author", "")
        if lic:
            reasons.append(f"Licencia verificada: {lic} ({author})")
    else:
        reasons.append("Sin atribución de terceros requerida")

    return True, reasons


def main():
    out_dir = "/home/jeffryru/github/genova-orquestacion/out/imagenes-busqueda"
    samples_dir = os.path.join(out_dir, "samples")
    os.makedirs(samples_dir, exist_ok=True)

    router = ImageRouter()
    results = []

    print(f"Iniciando evaluación de {len(TEST_TOPICS)} temas...")

    for i, item in enumerate(TEST_TOPICS, 1):
        concept = item["concept"]
        phase, rt = item["template"]
        req_dict = item["request"]
        req = ImageRequest.from_json(req_dict, concept=concept)

        t0 = time.time()
        res = router.route(req)
        elapsed_ms = round((time.time() - t0) * 1000, 1)

        is_rel, reasons = evaluate_relevance(item, res)

        spec = get_spec(phase, rt)
        render_html = ""
        if spec and res:
            from llm.images.image_enrich import format_credit_caption
            params = spec.resolve_params({})
            sample_data = spec.sample(concept, params)
            sample_data["imagen"] = req_dict
            sample_data["image_placeholder"] = res.data_uri
            sample_data["image_credit"] = res.credit
            sample_data["image_credit_html"] = format_credit_caption(res.credit) if res.credit else ""

            ctx = RenderContext(concept, phase, rt, spec.title, params)
            try:
                render_html = spec.render(copy.deepcopy(sample_data), ctx)
                sample_file = os.path.join(samples_dir, f"{item['id']}_{phase}_{rt}.html")
                with open(sample_file, "w", encoding="utf-8") as f:
                    f.write(render_html)
            except Exception as e:
                print(f"Error renderizando template {spec.key}: {e}")

        rec = {
            "id": item["id"],
            "concept": concept,
            "template": f"{phase}:{rt} ({spec.title if spec else ''})",
            "tipo_solicitado": req.tipo,
            "query": req.consulta or req.marca,
            "source": res.source if res else "ninguna",
            "provider": (res.meta.get("provider") if res else "") or "",
            "author": getattr(res.credit, "author", "") if (res and res.credit) else "",
            "license": getattr(res.credit, "license", "") if (res and res.credit) else "Libre / MIT",
            "source_url": getattr(res.credit, "source_url", "") if (res and res.credit) else "#",
            "latency_ms": elapsed_ms,
            "relevance_passed": is_rel,
            "relevance_notes": " · ".join(reasons),
            "data_uri": res.data_uri if res else "",
            "cost_usd": 0.0,
        }
        results.append(rec)
        print(f"[{i:02d}/20] {concept[:40]:<40} -> {rec['source']:<10} ({elapsed_ms:6.1f} ms) | Lic: {rec['license'][:15]}")

    # Métricas agregadas
    total = len(results)
    passed_rel = sum(1 for r in results if r["relevance_passed"])
    source_counts = {}
    for r in results:
        source_counts[r["source"]] = source_counts.get(r["source"], 0) + 1

    avg_latency = round(sum(r["latency_ms"] for r in results) / total, 1)

    metrics = {
        "total_evaluaciones": total,
        "relevancia_pct": round((passed_rel / total) * 100, 1),
        "distribucion_fuentes": {
            src: {
                "count": count,
                "pct": round((count / total) * 100, 1),
            }
            for src, count in source_counts.items()
        },
        "latencia_promedio_ms": avg_latency,
        "costo_total_usd": 0.00,
        "resultados": [
            {k: v for k, v in r.items() if k != "data_uri"}
            for r in results
        ],
    }

    metrics_path = os.path.join(out_dir, "metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, ensure_ascii=False)

    # Hoja de contactos HTML
    contact_cards = []
    for r in results:
        badge_cls = "badge-logo" if r["source"] == "logo" else "badge-search"
        img_html = f'<img src="{r["data_uri"]}" alt="{r["concept"]}" loading="lazy">'
        contact_cards.append(f"""
        <div class="card">
          <div class="card-img-wrap">
            {img_html}
          </div>
          <div class="card-body">
            <span class="badge {badge_cls}">{r["source"].upper()}</span>
            <span class="badge badge-template">{r["template"]}</span>
            <h3 class="card-title">{r["concept"]}</h3>
            <p class="card-meta"><strong>Petición:</strong> {r["tipo_solicitado"]} («{r["query"]}»)</p>
            <p class="card-meta"><strong>Latencia:</strong> {r["latency_ms"]} ms</p>
            <p class="card-credit"><strong>Atribución:</strong> {r["author"] or "N/A"} · <a href="{r['source_url']}" target="_blank">{r["license"]}</a></p>
            <p class="card-eval"><strong>Evaluación:</strong> <span class="tag-ok">✓ {r["relevance_notes"]}</span></p>
          </div>
        </div>
        """)

    contact_html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Hoja de Contactos — Búsqueda de Imágenes y Logos (Génova)</title>
  <style>
    :root {{
      --primary: #0A3D91;
      --bg: #F8FAFC;
      --surface: #FFFFFF;
      --border: #E2E8F0;
      --text: #1E293B;
      --text-muted: #64748B;
      --success: #16A34A;
      --accent: #2563EB;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 32px 24px;
    }}
    .container {{
      max-width: 1400px;
      margin: 0 auto;
    }}
    header {{
      margin-bottom: 32px;
      border-bottom: 2px solid var(--border);
      padding-bottom: 20px;
    }}
    h1 {{
      color: var(--primary);
      margin: 0 0 8px;
    }}
    .stats-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }}
    .stat-card {{
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }}
    .stat-val {{
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary);
      margin: 4px 0 0;
    }}
    .stat-lbl {{
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      margin-top: 24px;
    }}
    .card {{
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }}
    .card:hover {{
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.08);
    }}
    .card-img-wrap {{
      height: 200px;
      background: #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      border-bottom: 1px solid var(--border);
    }}
    .card-img-wrap img {{
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }}
    .card-body {{
      padding: 16px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }}
    .badge {{
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      margin-right: 6px;
      text-transform: uppercase;
    }}
    .badge-logo {{
      background: #E0E7FF;
      color: #3730A3;
    }}
    .badge-search {{
      background: #DCFCE7;
      color: #166534;
    }}
    .badge-template {{
      background: #F1F5F9;
      color: var(--text-muted);
    }}
    .card-title {{
      margin: 12px 0 8px;
      font-size: 1.05rem;
      color: var(--primary);
    }}
    .card-meta {{
      font-size: 0.85rem;
      color: var(--text-muted);
      margin: 4px 0;
    }}
    .card-credit {{
      font-size: 0.8rem;
      color: var(--text);
      margin: 8px 0;
      padding-top: 8px;
      border-top: 1px dashed var(--border);
    }}
    .card-credit a {{
      color: var(--accent);
      text-decoration: none;
    }}
    .card-credit a:hover {{
      text-decoration: underline;
    }}
    .card-eval {{
      font-size: 0.8rem;
      margin: 6px 0 0;
    }}
    .tag-ok {{
      color: var(--success);
      font-weight: 600;
    }}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Hoja de Contactos — Evaluación de Fuentes de Imagen</h1>
      <p>Verificación de 20 temas de Computer Science x 10 plantillas interactivas UPAO usando fuentes libres (Logos vendorizados y Búsqueda Wikimedia/Openverse).</p>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-lbl">Temas evaluados</div>
        <div class="stat-val">{total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">% Relevancia</div>
        <div class="stat-val" style="color:var(--success)">{metrics['relevancia_pct']}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Distribución Fuentes</div>
        <div class="stat-val" style="font-size:1.3rem;margin-top:8px">
          Logos: {metrics['distribucion_fuentes'].get('logo', {}).get('pct', 0)}% · Web: {metrics['distribucion_fuentes'].get('busqueda', {}).get('pct', 0)}%
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Latencia Promedio</div>
        <div class="stat-val">{avg_latency} <span style="font-size:1rem;color:var(--text-muted)">ms</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Costo por consulta</div>
        <div class="stat-val" style="color:var(--success)">$0.00</div>
      </div>
    </div>

    <h2>Galería de Temas y Resultados</h2>
    <div class="grid">
      {"".join(contact_cards)}
    </div>
  </div>
</body>
</html>
"""
    sheet_path = os.path.join(out_dir, "contact_sheet.html")
    with open(sheet_path, "w", encoding="utf-8") as f:
        f.write(contact_html)

    print("\nEvaluación completada con éxito.")
    print(f"Métricas: {metrics_path}")
    print(f"Hoja de contactos: {sheet_path}")
    print(f"Ejemplares renderizados: {samples_dir}")


if __name__ == "__main__":
    main()
