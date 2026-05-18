# Contributing to Sepet

Thanks for your interest in contributing! This document explains how to get the project running locally and the conventions we follow.

## Getting Started

1. Fork the repository and clone your fork.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy `.env.example` to `.env.local` and fill in the required environment variables.
4. Run the development server:
   ```bash
   pnpm dev
   ```

## Branching

- Base your work on the latest `master` branch.
- Use a descriptive branch name with a prefix:
  - `feat/` for new features
  - `fix/` for bug fixes
  - `refactor/` for code restructuring
  - `docs/` for documentation only
  - `chore/` for tooling, deps, and other maintenance

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(optional-scope): <short description>
```

Example: `feat(assistant): add streaming reasoning support`

## Pull Requests

Before opening a PR, please make sure:

- `pnpm typecheck` passes
- `pnpm lint` passes
- `pnpm format` has been run
- New behavior is manually tested in the browser when it affects the UI
- The PR description explains **what** changed and **why**

PRs are squash-merged. Keep the title clean — it becomes the commit message on `master`.

## Code Style

- TypeScript is required. Avoid `any`.
- Prefer Server Components; mark Client Components with `"use client"` only when needed.
- Use the existing UI primitives in `components/ui/` instead of introducing new libraries.
- Tailwind utility classes only — no inline `style` props unless dynamic.
- Don't add comments that restate what the code does.

## Reporting Bugs

Open an issue with:

- A clear title and short description
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots or screen recordings when relevant
- Environment (browser, OS)

## Security Issues

Do **not** open a public issue for security vulnerabilities. Follow the process in [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](../LICENSE).
