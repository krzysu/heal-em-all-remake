# Heal'em All (remake)

Phaser 4 + TypeScript + Vite remaster of the 2013 HTML5 game. See `PLAN.md` for
the migration phases and design pillars.

## Quality gates

Run everything before considering a change done:

```
pnpm check
```

That is a shorthand for, in order:

| Command              | What it enforces                                            |
| -------------------- | ----------------------------------------------------------- |
| `pnpm typecheck`     | `tsc --strict` plus `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `erasableSyntaxOnly` |
| `pnpm lint`          | `oxlint` (correctness/suspicious/perf + curated rules)       |
| `pnpm format:check`  | Prettier, no semicolons, single quotes, 100 cols             |
| `pnpm test`          | Vitest unit tests (`src/**/*.test.ts`, jsdom)                |
| `pnpm knip`          | Unused files, exports, types and dependencies                |
| `pnpm build`         | Production bundle (`tsc --noEmit && vite build`)             |

Use `pnpm lint:fix` and `pnpm format` to fix lint and formatting issues.

### Why oxlint instead of ESLint

TypeScript 7 is the native compiler and no longer ships the programmatic JS API
that `typescript-eslint` needs (`lib/typescript.js` is gone), and
typescript-eslint 8 hard-fails on TS >= 7. Oxlint parses TypeScript itself, so it
has no compiler-API dependency. Type safety comes from `tsc`, not from lint
rules, which is why the tsconfig is deliberately strict.

## Conventions

- No comments unless they explain *why*.
- Commit messages are a single line: `<prefix>: <imperative summary>`.
- Comments and code are ASCII unless a file already uses non-ASCII.
