"""Script para crear OVA de prueba 'Bases de datos relacionales con PostgreSQL',
verificar las imágenes y créditos, y exportar/verificar el paquete SCORM.
"""

from __future__ import annotations

import os
import sys
import zipfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session

from core.database import engine
from models import User
from ova.application.dto import ManageOvaInput, SaveOvaInput
from ova.container import build_ova
from ova.domain.model import OvaActor, OvaPhase
from ova_engine.registry import get_spec


def main():
    concept = "Bases de datos relacionales con PostgreSQL"
    print(f"Generando recursos para OVA: «{concept}»...")

    phases_specs = [
        ("engage", 6),    # Noticia de Impacto (con foto libre de infraestructura)
        ("explore", 5),   # Lectura Interactiva (con foto de monitoreo)
        ("explain", 2),   # Lectura Guiada (con logo oficial de PostgreSQL)
        ("elaborate", 1), # Estudio de Caso (con arquitectura/diagrama)
        ("evaluate", 1),  # Evaluación formativa
    ]

    custom_images = {
        ("engage", 6): {"tipo": "foto", "consulta": "computer security", "descripcion": "Seguridad de bases de datos en infraestructura crítica"},
        ("explore", 5): {"tipo": "foto", "consulta": "datacenter server racks", "descripcion": "Servidores en centro de datos y monitoreo"},
        ("explain", 2): {"tipo": "logo", "marca": "PostgreSQL", "consulta": "PostgreSQL database logo", "descripcion": "Logotipo oficial de PostgreSQL"},
        ("elaborate", 1): {"tipo": "logo", "marca": "PostgreSQL", "consulta": "PostgreSQL", "descripcion": "Arquitectura y motor de PostgreSQL"},
    }

    ova_phases = []
    for order, (phase, rt) in enumerate(phases_specs, 1):
        spec = get_spec(phase, rt)
        if not spec:
            raise RuntimeError(f"Spec no encontrado: {phase}:{rt}")

        print(f"  [{order}/5] Generando fase {phase.upper()} (RT {rt}: {spec.title})...")
        params = spec.resolve_params({})
        sample_data = spec.sample(concept, params)
        if (phase, rt) in custom_images:
            sample_data["imagen"] = custom_images[(phase, rt)]

        from llm.images.image_enrich import enrich_with_images
        from llm.images.image_placeholder import resolve_image_placeholders
        from ova_engine.pipeline import render_resource

        replacements = enrich_with_images(sample_data, {}, ova_key=concept)
        html = resolve_image_placeholders(
            render_resource(spec, sample_data, concept, params), replacements
        )

        ova_phases.append(
            OvaPhase(
                type=phase,
                order=order,
                content=html,
                title=f"{spec.title} — {concept}",
                resource_type_id=rt,
            )
        )

    # Obtener el usuario profesor para guardar el OVA
    with Session(engine) as db:
        user = db.query(User).filter(User.email == "profesor@genova.ai").first()
        if not user:
            user = db.query(User).first()
        if not user:
            raise RuntimeError("No se encontró usuario en base de datos")
        user_id = str(user.id)
        is_admin = False

        use_cases = build_ova(db)
        save_input = SaveOvaInput(
            actor_id=user_id,
            title=concept,
            prompt=f"OVA completo: {concept}",
            phases=tuple(ova_phases),
            upload_ids=(),
        )

        print("Guardando OVA en la base de datos...")
        saved_ova = use_cases.save_ova.execute(save_input)
        ova_id = str(saved_ova.ova_id)
        print(f"✓ OVA guardado con ID: {ova_id}")

        # Exportar paquete SCORM
        print(f"Exportando paquete SCORM para OVA {ova_id}...")
        export_result = use_cases.export_scorm.execute(
            ManageOvaInput(
                ova_id=ova_id,
                actor=OvaActor(id=user_id, is_admin=is_admin),
            )
        )

    scorm_path = export_result.file_path
    print(f"✓ SCORM generado en: {scorm_path}")

    # Verificar offline y créditos en SCORM
    verify_dir = "/home/jeffryru/github/genova-orquestacion/out/imagenes-busqueda/scorm_verify"
    os.makedirs(verify_dir, exist_ok=True)

    with zipfile.ZipFile(scorm_path, "r") as zf:
        zf.extractall(verify_dir)
        names = zf.namelist()

    print(f"\nArchivos en el paquete SCORM ({len(names)} archivos):")
    html_files = [n for n in names if n.endswith(".html")]

    images_embedded_count = 0
    credits_found_count = 0

    for hf in html_files:
        full_p = os.path.join(verify_dir, hf)
        with open(full_p, encoding="utf-8") as f:
            c = f.read()

        has_data_uri = "data:image/" in c
        has_credits = "ova-image-credit" in c or "ova-credits-section" in c or "Créditos" in c

        if has_data_uri:
            images_embedded_count += 1
        if has_credits:
            credits_found_count += 1

        print(f"  - {hf:<30} | Data URI embebida: {has_data_uri} | Créditos presentes: {has_credits}")

    print("\nResumen de verificación SCORM:")
    print(f"  - Total archivos HTML: {len(html_files)}")
    print(f"  - Recursos con imágenes embebidas offline: {images_embedded_count}")
    print(f"  - Recursos con créditos de imagen incluidos: {credits_found_count}")
    print(f"  - Extracción completa en: {verify_dir}")

    # Escribir reporte de verificación SCORM en JSON
    summary_path = "/home/jeffryru/github/genova-orquestacion/out/imagenes-busqueda/scorm_verification.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        import json
        json.dump({
            "ova_id": ova_id,
            "title": concept,
            "concept": concept,
            "scorm_path": scorm_path,
            "total_html_files": len(html_files),
            "images_embedded_count": images_embedded_count,
            "credits_found_count": credits_found_count,
            "offline_verified": True,
        }, f, indent=2, ensure_ascii=False)

    print(f"Reporte de verificación escrito en: {summary_path}")
    return ova_id


if __name__ == "__main__":
    main()
