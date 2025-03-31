# V2 Slot Engine: Game Creation Workflow

This document outlines the step-by-step process for creating a new slot game package within the V2 engine monorepo.

**Prerequisites:**
*   The monorepo structure (`engine-core`, `game-configs`, `shared-utils`, `games/`) is set up.
*   Core engine packages (`engine-core`, `game-configs`, `shared-utils`) are built (e.g., via `pnpm build` or `turbo run build`).
*   You have the game design document (GDD), including mechanics, math model, features, art style, and sound requirements.
*   You have the game assets (images, sounds, Spine files, fonts) prepared.

**Goal:** Create a new, runnable game package (e.g., `packages/games/new-awesome-game/`) that uses the `engine-core`.

## Workflow Steps

1.  **Create Game Package Directory:**
    *   **Action:** Create a new directory under `packages/games/` named appropriately (e.g., `new-awesome-game`).
    *   **Location:** `packages/games/new-awesome-game/`

2.  **Initialize Game Package:**
    *   **Action:** Create `package.json` inside the new directory.
        *   Set `name` (e.g., `@heavens-ten/new-awesome-game`).
        *   Add dependencies:
            *   `@heavens-ten/engine-core`: "workspace:*"
            *   `@heavens-ten/game-configs`: "workspace:*"
            *   `@heavens-ten/shared-utils`: "workspace:*"
            *   `react`, `react-dom` (usually peer dependencies, check `engine-core` setup)
        *   Add devDependencies: `typescript`, `vite`, `@vitejs/plugin-react`.
        *   Define `scripts` for `dev`, `build`, `clean` using Vite.
    *   **Action:** Create `tsconfig.json`, extending the root `tsconfig.base.json` and enabling JSX.
    *   **Location:** `packages/games/new-awesome-game/`

3.  **Add Package to Workspace:**
    *   **Action:** Add the path to the new package (`packages/games/new-awesome-game`) to the `workspaces` definition in the root `package.json` and/or `pnpm-workspace.yaml`.
    *   **Action:** Run `pnpm install` from the monorepo root to link dependencies.
    *   **Location:** Monorepo Root

4.  **Create Core Directories:**
    *   **Action:** Create the standard source structure within the game package: `src/`, `src/config/`, `src/assets/`, `src/components/`, `src/features/` (if needed), `public/`.
    *   **Location:** `packages/games/new-awesome-game/`

5.  **Add Assets:**
    *   **Action:** Copy all prepared game-specific assets (images in subfolders like `symbols`, `ui`, `backgrounds`; sounds; fonts; Spine files) into `src/assets/`.
    *   **Location:** `packages/games/new-awesome-game/src/assets/`

6.  **Define Game Configuration (`src/config/`):**
    *   **Action:** Create configuration files (`settings.ts`, `symbols.ts`, `reels.ts`, `paylines.ts` (or `ways.ts`), `assets.ts`, `sounds.ts`, `animations.ts`, `features.ts`, etc.) within `src/config/`.
    *   **Action:** In each file, define and export configuration objects that **strictly implement the corresponding interfaces** from `@heavens-ten/game-configs`.
        *   Pay close attention to `GameSettings` flags (`reelType`, `winEvaluationType`, feature flags).
        *   Define the `AssetManifest` in `assets.ts`, pointing correctly to the files added in the previous step.
        *   Define `Paytable`, `ReelStripSet`, `PaylineSet` (if applicable).
        *   Define `AnimationTimings`.
        *   Define `FeatureParameters` (e.g., for Free Spins).
    *   **Action:** Create `src/config/index.ts` that imports all specific config objects and exports a single `gameConfiguration: GameConfiguration` object.
    *   **Location:** `packages/games/new-awesome-game/src/config/`

7.  **Implement Game-Specific Components (Optional but Common):**
    *   **Action:** If the game requires unique visuals beyond asset swapping:
        *   Create an **Intro/Loading Screen** component (`src/components/IntroScreen.tsx`). This component will use `engine-core`'s `useAssets` hook to load initial assets and display branding/progress.
        *   Create a **Background Component** (`src/components/Background.tsx`) if it needs custom logic or animations.
        *   Create a **Custom Symbol Component** (`src/components/Symbol.tsx`) if symbols need unique idle/win animations (GSAP/Spine) beyond the engine's default. This component receives symbol state as props and handles its specific rendering/animation.
        *   Create components for **Unique Bonus/Feature UIs** (`src/components/bonus/MyBonusGame.tsx`).
    *   **Location:** `packages/games/new-awesome-game/src/components/`

8.  **Implement Game-Specific Feature Logic (If Needed):**
    *   **Action:** If the game has features with unique logic not covered by the generic engine implementation (e.g., a symbol collection mechanic, a specific bonus game interaction model):
        *   Create custom React hooks or logic modules within `src/features/` (e.g., `src/features/symbol-collection/useSymbolCollection.ts`).
        *   These hooks will typically interact with the engine's Zustand store (`useGameState`) to read game state and trigger engine actions or update game-specific state slices.
    *   **Location:** `packages/games/new-awesome-game/src/features/`

9.  **Create Main Entry Point (`src/main.tsx`):**
    *   **Action:** Set up the React application root (`ReactDOM.createRoot`).
    *   **Action:** Import the `gameConfiguration` from `src/config/index.ts`.
    *   **Action:** Import necessary components from `engine-core` (e.g., `<GameContainer>`).
    *   **Action:** Import game-specific components (like `<IntroScreen>`, `<Background>`, custom symbol renderer function).
    *   **Action:** Implement the main application component (`App`):
        *   Optionally render the game-specific `<IntroScreen>` first, potentially using `useAssets` to track loading.
        *   Once ready, render the engine's `<GameContainer>` component.
        *   Pass the `gameConfiguration` object as a prop.
        *   Pass game-specific components as props where the engine allows overrides (e.g., `backgroundComponent={MyGameBackground}`, `renderSymbol={myGameSymbolRenderer}`).
    *   **Location:** `packages/games/new-awesome-game/src/main.tsx`

10. **Configure Build (`vite.config.ts`, `public/index.html`):**
    *   **Action:** Create a basic `public/index.html` file with a root div for React to mount into.
    *   **Action:** Create `vite.config.ts`, configure the React plugin, and set up any necessary paths or build options.
    *   **Location:** `packages/games/new-awesome-game/`

11. **Develop & Test:**
    *   **Action:** Run the game in development mode from the monorepo root: `pnpm --filter @heavens-ten/new-awesome-game dev` (or `turbo run dev --filter=@heavens-ten/new-awesome-game`).
    *   **Action:** Implement game logic, refine configurations, test features thoroughly.
    *   **Action:** Write unit/integration tests for any game-specific logic or components.

12. **Build for Production:**
    *   **Action:** Run the build command from the root: `pnpm --filter @heavens-ten/new-awesome-game build` (or `turbo run build --filter=@heavens-ten/new-awesome-game`).
    *   **Action:** The production-ready assets will typically be in the `dist/` folder of the game package.

This workflow emphasizes leveraging the reusable engine while providing clear steps for integrating game-specific assets, configurations, components, and logic.
