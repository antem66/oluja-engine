# Roadmap: Phase 2 - Core Rendering & Static Display

**Reference Docs:**
*   `docs/v2/02-engine-core-deep-dive.md` (Components, Hooks)
*   `docs/v2/03-configuration-system.md` (Config Interfaces)
*   `docs/v2/04-game-creation-workflow.md` (Game setup)

**Goal:** Implement the basic rendering pipeline using React/@pixi/react, load assets defined in configuration, and display a static game scene (initial reel layout) based on a game package's configuration.

**Prerequisites:** Phase 1 (Foundation Setup) Completed.

**Outcome:** Running the initial game package (`heavens-ten-deluxe-react`) displays the correct static layout of reels and symbols, using textures loaded according to the game's configuration.

**Key Steps & Tasks:**

1.  **Implement Asset Loading (`engine-core`):**
    *   `[Task]` Implement the `useAssets` hook (`src/hooks/useAssets.ts`).
        *   Accepts an `AssetManifest` (from game config).
        *   Uses `PIXI.Assets.addBundle` / `PIXI.Assets.loadBundle`.
        *   Handles different asset types conceptually (focus on `texture` initially).
        *   Provides loading state (`isLoading`, `progress`) and a map of loaded textures (`Record<string, PIXI.Texture>`).
        *   Implement basic error handling for failed loads.
    *   `[Task]` Write unit tests for `useAssets` (mocking `PIXI.Assets`).
2.  **Implement Game Entry Point & Config Loading (`games/heavens-ten-deluxe-react`):**
    *   `[Task]` Populate the game's `src/config/` directory by migrating data from the original vanilla engine's config files (`symbols.ts`, `reels.ts`, `settings.ts`, `assets.ts`), ensuring they match the interfaces from `game-configs`.
    *   `[Task]` Implement the main `src/main.tsx`:
        *   Import the game's `gameConfiguration`.
        *   Implement the root `App` component.
        *   Render the main `<GameContainer>` from `engine-core`, passing `gameConfiguration.settings` and potentially the full config.
    *   `[Task]` Implement `public/index.html` and basic `vite.config.ts`.
3.  **Implement Core Layout Components (`engine-core`):**
    *   `[Task]` Implement `<GameContainer>` (`src/components/layout/GameContainer.tsx`):
        *   Accepts `GameSettings` props.
        *   Uses `useAssets` hook with `settings.assets` to load assets.
        *   Renders `@pixi/react` `<Stage>` with configured dimensions/background.
        *   Conditionally renders children (e.g., `<ReelContainer>`) based on asset loading state.
        *   (Optional) Implement basic `<ScaledContainer>` if needed for initial layout scaling.
    *   `[Task]` Implement `<ReelContainer>` (`src/components/reels/common/ReelContainer.tsx`):
        *   Accepts reel configuration (`settings.reels`).
        *   Maps over `settings.reels.positions`.
        *   Renders the appropriate reel strip component (initially `StandardReelStrip`) at each position, passing necessary props (reel index, reel strip data, `renderSymbol` function).
    *   `[Task]` Write basic component tests (RTL) ensuring components render without errors and accept props.
4.  **Implement Standard Reel & Symbol Components (`engine-core`):**
    *   `[Task]` Implement `<BaseSymbol>` (`src/components/reels/common/BaseSymbol.tsx`):
        *   Accepts `texture: PIXI.Texture`, `x`, `y` props.
        *   Renders an `@pixi/react <Sprite>` using the texture.
        *   (Simple version initially, state handling comes later).
    *   `[Task]` Implement `StandardReelStrip` (`src/components/reels/standard/StandardReelStrip.tsx`):
        *   Accepts props: `reelIndex`, `reelStripData: string[]`, `symbolHeight`, `rows`, `renderSymbol: (symbolData) => ReactNode`.
        *   Calculates initial visible symbols based on `rows`.
        *   Renders a vertical strip of symbols using `@pixi/react <Container>` and the passed `renderSymbol` function (providing it with necessary data like symbol ID and position index).
        *   Implements basic masking if needed to show only the configured number of rows.
    *   `[Task]` Implement a default `renderSymbol` function (likely within `ReelContainer` or `StandardReelStrip`) that uses `<BaseSymbol>`.
    *   `[Task]` Write basic component tests (RTL).
5.  **Integration & Verification:**
    *   `[Task]` Ensure the `renderSymbol` function passed down correctly receives texture data from `useAssets` (likely via context or props passed through `GameContainer` -> `ReelContainer` -> `StandardReelStrip`).
    *   `[Task]` Run the `heavens-ten-deluxe-react` game (`pnpm --filter @heavens-ten/new-awesome-game dev`).
    *   `[Task]` Verify: The stage appears with the correct dimensions/background. The correct number of reels are displayed in the configured positions. Each reel shows the initial static segment of symbols from the config, rendered using the correct textures loaded via `useAssets`.

**Definition of Done:**
*   `useAssets` hook loads textures defined in game config.
*   Core layout components (`GameContainer`, `ReelContainer`) are implemented.
*   Standard reel (`StandardReelStrip`) and symbol (`BaseSymbol`) components render correctly.
*   The initial game package (`heavens-ten-deluxe-react`) runs and displays the static, configured initial reel layout using loaded assets.
*   Basic unit and component tests pass for new components/hooks.

**Tracking:**
*   Create tickets for each `[Task]`, track progress.
*   Conduct code reviews for core engine components.
*   Hold a phase gate review: Demonstrate the static rendering from config. Confirm architecture holds before Phase 3.
