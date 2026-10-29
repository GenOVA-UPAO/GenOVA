# Área temática de la plataforma (Modelos de IA → Plataforma). Es configuración
# GLOBAL: los escenarios llevan @global-config y corren en un proyecto aparte, DESPUÉS
# del resto (ver playwright.config.js), y un hook final deja el área desactivada.
# Con LLM_FAKE=1 el clasificador es determinista (backend/generation/infrastructure/
# input_guardrail.py): un prompt cuyo texto no comparte ninguna palabra (4+ letras)
# con el área se rechaza.
Feature: FP-004 e2e — Área temática configurable por el administrador

  @global-config
  Scenario: El área activa se avisa en Crear OVA y rechaza un prompt fuera de área
    Given que estoy autenticado como usuario con rol "administrador"
    When activo el área temática "machine learning" en la configuración de la plataforma
    And navego a "/crear"
    Then Crear OVA muestra la nota del área "machine learning"
    When escribo un prompt válido sobre "paella valenciana"
    And configuro recursos en al menos dos fases
    And inicio la generación del OVA
    Then veo el rechazo por prompt fuera del área "machine learning"

  @global-config
  Scenario: Un prompt dentro del área sí se genera
    Given que estoy autenticado como usuario con rol "administrador"
    When activo el área temática "machine learning" en la configuración de la plataforma
    And navego a "/crear"
    And escribo un prompt válido sobre "machine learning supervisado"
    And configuro recursos en al menos dos fases
    And inicio la generación del OVA
    Then la generación redirige al workspace del OVA
