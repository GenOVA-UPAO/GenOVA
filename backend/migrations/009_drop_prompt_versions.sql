-- Migration 009: drop prompt_versions
-- The Labs prompt-override subsystem was removed. Prompts now live only in
-- code (agents/engage_prompts.py, agents/explore_prompts.py); Labs is a pure
-- experimentation sandbox. lab_results is kept.

DROP TABLE IF EXISTS prompt_versions;
