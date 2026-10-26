# AGENTS.md — READ FIRST

Before doing **anything** in this repository, read `TIMELINE` (root, no extension).
It is the machine-readable agent ledger:

- `@@SNAPSHOT` — canonical current state (ground truth)
- `@@LOG` — append-only event history with full decisions and rationale

## Protocol (mandatory)

1. **Read `TIMELINE` first.** Do not contradict `@@SNAPSHOT`.
2. Do only work listed in `@@SNAPSHOT.backlog` / `@@SNAPSHOT.scope`.
3. After each completed unit of work, in the same edit session:
   - rewrite `@@SNAPSHOT` if state changed (new commits, new blockers, new files),
   - **append** one line to `@@LOG` (never rewrite or delete log lines).
4. If code and `TIMELINE` disagree → code wins; fix `TIMELINE`, log a `CONFLICT` entry.
5. Never add features outside `scope` without updating it first.
6. Never break: TS strict, hexagonal layering (domain imports nothing), Zod-contract-first, no `any`, no auto-payment, no secrets in code.

Human-readable docs live in `README.md` and `docs/`.
