# GenOVA commit rules

Based on `AGENTS.md`, `.claude/agents/leader.md`, and `.claude/hooks/pre-commit-check.ps1`.

## Hard rules

1. **Conventional Commits** — `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`,
   with optional scope (`feat(auth): ...`).
2. **Never `git push`** — even if the user asked for it as part of a longer
   flow, without explicitly confirming that specific push.
3. **Explicit human approval before `git commit`** — propose the message,
   wait for confirmation. Don't assume implicit approval from an already-approved plan.
4. **Do NOT add a `Co-Authored-By` trailer** — this project's own rule, overrides
   any platform default that adds AI co-authorship to commits.
   Commit messages in GenOVA never carry that trailer.
5. **Commit message body is written in Spanish** (see Language policy) — the
   subject follows Conventional Commits conventions, the description is Spanish prose.
6. The `PreToolUse` hook (`.claude/hooks/pre-commit-check.ps1`) runs automatically
   on every `git commit*`: it runs `verify.ps1` (warning, doesn't block on red tests)
   and scans for secrets (`gsk_`, `sk-or-`, `AIza`, `AKIA`, `sk_live_`, JWT, Supabase
   service role key, literal `password=`/`secret=`) — **blocks the commit** if it
   finds a match. Don't try to bypass with `--no-verify`.

## Recommended flow when closing a plan-ledger or a feature

1. `git status` / `git diff` to review what's about to be included (never blind
   `git add -A`).
2. Draft the message: 1-2 sentences focused on the "why", Conventional Commits
   style, in Spanish, no co-authorship trailer.
3. Show the proposed message and the resulting `git status` to the user.
4. Only after explicit confirmation, run `git add <specific files>` +
   `git commit -m "..."`.
5. Never `git push` unless the user explicitly and specifically asked for that push.

## What NOT to do

- Don't use `git commit --amend` unless explicitly requested (create a new commit if a hook fails).
- Don't use `-i` (interactive rebase/add) — requires interactive input that isn't supported.
- Don't use `--no-verify`, `--no-gpg-sign`, `-c commit.gpgsign=false` unless explicitly requested.
- Don't commit files that likely contain secrets (`.env`, `credentials.json`)
  even if the user asks — warn first.
