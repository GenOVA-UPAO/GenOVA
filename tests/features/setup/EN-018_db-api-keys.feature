Feature: EN-018 DB-first LLM API keys
  As a platform admin
  I want API keys to be resolved from PlatformConfig DB
  So I can manage keys from the UI without touching .env

  Scenario: resolve key from PlatformConfig when DB row exists
    Given PlatformConfig has "groq_api_key" = "gsk_test123"
    When _get_provider_key is called for "groq"
    Then the returned key is "gsk_test123"

  Scenario: resolve key returns None when no DB row and no env var
    Given PlatformConfig has no "groq_api_key" row
    And env var "GROQ_API_KEY" is not set
    When _get_provider_key is called for "groq"
    Then the returned key is None

  Scenario: cache TTL — second call within 30s skips DB query
    Given PlatformConfig has "groq_api_key" = "gsk_cached"
    When _get_provider_key is called for "groq" twice within 30s
    Then the DB is queried only once
