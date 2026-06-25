#!/usr/bin/env python3
"""Dry-run mode for Prompt Lab — displays prompts without calling the API."""


def show_dry_run(phase: str, rtype: int, concept: str) -> None:
    """Print the prompt(s) that would be sent for the given phase/type/concept."""
    try:
        if phase == "engage":
            from prometheus.prompts.engage_prompts import (
                prompt_html,
                prompt_simulador,
                prompt_texto,
            )

            if rtype == 10:
                print("\n── prompt_simulador ──────────────────────────────────")
                print(prompt_simulador(concept))
            else:
                print("\n── prompt_texto (paso 1) ─────────────────────────────")
                print(prompt_texto(rtype, concept))
                print("\n── prompt_html (paso 2) ──────────────────────────────")
                print(prompt_html(rtype, concept, '{"placeholder": "...JSON del paso 1..."}'))
        else:
            from prometheus.prompts.explore_prompts import (
                CODE_ONLY,
                prompt_codigo,
                prompt_html,
                prompt_texto,
            )

            if rtype in CODE_ONLY:
                print("\n── prompt_codigo ─────────────────────────────────────")
                print(prompt_codigo(rtype, concept))
            else:
                print("\n── prompt_texto (paso 1) ─────────────────────────────")
                print(prompt_texto(rtype, concept))
                print("\n── prompt_html (paso 2) ──────────────────────────────")
                print(prompt_html(rtype, concept, '{"placeholder": "...JSON del paso 1..."}'))
    except ImportError as e:
        print(f"✗ No se pudo importar prompts: {e}")
        print("  Ejecuta desde backend/ o con el venv activado.")
