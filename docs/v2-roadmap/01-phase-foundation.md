# Roadmap: Phase 1 - Foundation Setup

**Reference Docs:**
*   `docs/v2/01-architecture-overview.md` (Monorepo Structure)
*   `docs/v2/03-configuration-system.md` (game-configs purpose)

**Goal:** Establish the monorepo structure, core package skeletons, build/lint/format tooling, base TypeScript configuration, and essential configuration types.

**Outcome:** A functional monorepo where core packages (`engine-core`, `game-configs`, `shared-utils`) can be built, depend on each other, and lint/format checks pass. The foundational types for game configuration are defined.

**Key Steps & Tasks:**

1.  **Initialize Monorepo:**
    *   `[Task]` Initialize pnpm workspace (`pnpm init`, create `pnpm-workspace.yaml`).
    *   `[Task]` (Optional but Recommended) Initialize Turborepo (`turbo init`). Configure basic pipelines in `turbo.json` (e.g., build depends on `^build`, lint/test). (*Decision: Confirm Turborepo usage*).
    *   `[Task]` Initialize Git repository (`git init`, create `.gitignore`).
2.  **Setup Root Tooling:**
    *   `[Task]` Define base `tsconfig.base.json` with strict settings suitable for the project.
    *   `[Task]` Setup ESLint (`eslint.config.js` or `.eslintrc.js`) with recommended rulesets (e.g., `eslint:recommended`, `plugin:@typescript-eslint/recommended`, `plugin:react/recommended`, `plugin:react-hooks/recommended`).
    *   `[Task]` Setup Prettier (`.prettierrc.js`, `.prettierignore`) for consistent code formatting.
    *   `[Task]` Add root `package.json` scripts for linting, formatting, building, and cleaning the entire workspace (e.g., `pnpm run lint`, `turbo run build`).
3.  **Create & Initialize Core Packages:**
    *   `[Task]` Create directories: `packages/engine-core`, `packages/game-configs`, `packages/shared-utils`, `packages/games`.
    *   `[Task]` For `engine-core`:
        *   Create `package.json` with name (`@heavens-ten/engine-core`), deps (`react`, `@pixi/react`, `pixi.js`, `gsap`, `zustand`), devDeps (`typescript`, `@types/*`). Define build/dev/clean scripts (using `tsc`).
        *   Create `tsconfig.json` extending base, enabling `jsx`.
        *   Create basic `src/index.ts` exporting a placeholder.
    *   `[Task]` For `game-configs`:
        *   Create `package.json` with name (`@heavens-ten/game-configs`), devDeps (`typescript`, potentially `zod`). Define build/dev/clean scripts.
        *   Create `tsconfig.json` extending base.
        *   Create basic `src/index.ts` exporting a placeholder.
    *   `[Task]` For `shared-utils`:
        *   Create `package.json` with name (`@heavens-ten/shared-utils`), devDeps (`typescript`). Define build/dev/clean scripts.
        *   Create `tsconfig.json` extending base.
        *   Create basic `src/index.ts` exporting a placeholder.
4.  **Define Initial Configuration Types (`game-configs`):**
    *   `[Task]` Create `packages/game-configs/src/types.ts`.
    *   `[Task]` Define core interfaces based on `docs/v2/03-configuration-system.md`: `GameSettings`, `SymbolDefinition`, `Paytable`, `AssetManifest`, `AssetDefinition`, `AnimationTimings`. Focus on the essential structure first.
    *   `[Task]` (Optional but Recommended) Define basic Zod schemas alongside types for validation.
    *   `[Task]` Update `packages/game-configs/src/index.ts` to export these types/schemas.
5.  **Setup Initial Game Package Skeleton (`games/`):**
    *   `[Task]` Create `packages/games/heavens-ten-deluxe-react/` directory.
    *   `[Task]` Create `package.json` for the game, listing workspace dependencies (`engine-core`, `game-configs`, `shared-utils`), `react`, `react-dom`. Add devDeps `vite`, `@vitejs/plugin-react`, `typescript`.
    *   `[Task]` Create game-specific `tsconfig.json` extending base.
    *   `[Task]` Create basic `src/` and `public/` directories.
    *   `[Task]` Add the new game package path to the root workspace configuration.
6.  **Verify Workspace Setup:**
    *   `[Task]` Run `pnpm install` from the root to ensure all dependencies install correctly.
    *   `[Task]` Run build command (`turbo run build` or `pnpm -r build`) to verify all packages build successfully.
    *   `[Task]` Run lint/format commands to ensure tooling is working.

**Definition of Done:**
*   Monorepo structure created and configured (pnpm + optional Turbo).
*   Root tooling (TypeScript, ESLint, Prettier) is set up.
*   Core packages (`engine-core`, `game-configs`, `shared-utils`) and initial game package skeleton exist with basic `package.json`, `tsconfig.json`.
*   Dependencies are correctly linked via workspaces.
*   Initial essential configuration types are defined in `game-configs`.
*   The entire workspace builds successfully without errors.
*   Linting and formatting checks pass.

**Tracking:**
*   Create tickets in the project management tool for each `[Task]` above.
*   Track progress against these tickets.
*   Conduct a phase gate review upon completion of all tasks to confirm the Definition of Done is met before proceeding to Phase 2.
