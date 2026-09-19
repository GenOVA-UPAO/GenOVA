"""Librería de capacidades LLM (subdominio de soporte).

Superficie amplia por submódulo (catalog/, clients/, images/, phases/, podcast/,
utils/, providers, router). No adopta la ceremonia hexagonal
domain/application/interface por decisión (KISS): es una biblioteca de
capacidades, no un dominio transaccional. Enforcement vía import-linter:
- las capas de utilidad (providers/clients/images/podcast/utils/ova_components)
  son framework-free;
- `llm` no depende de dominios superiores (users/ova/roles/scorm/uploads/generation).
Deuda conocida: ciclo llm.phases <-> prometheus.plans.
"""
