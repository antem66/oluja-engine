# Plan: Migrating to React Slot Engine Architecture

**Goal:** Transition from the existing vanilla JS engine to a new monorepo structure using React, `@pixi/react`, Zustand, GSAP, and TypeScript, creating a **highly extensible foundation** capable of supporting diverse slot game mechanics (standard, tumbling, Megaways, etc.) and features, leveraging existing configurations and assets.

**Core Principles for Extensibility:**
*   **Configuration-Driven Engine:** `engine-core` components and hooks MUST be primarily driven by detailed game configuration provided by individual `games/*` packages.
*   **Composition & Pluggable Logic:** Favor composing engine capabilities and potentially using strategy patterns (via interfaces defined in `game-configs` and implemented in `engine-core` or `games/*`) for core mechanics with significant variations (e.g., win evaluation, spin cycle reaction). This keeps `engine-core` adaptable.
*   **Clear Separation:** Unique game logic, components, and state variations MUST reside within the specific `games/*` package, not pollute `engine-core`.
*   **Refined Structure:** Organize `engine-core` with clear sub-directories anticipating different mechanics.

**Assumptions:**
*   A new monorepo project will be created (or the existing one heavily restructured).
*   Monorepo tooling (pnpm workspaces + optional Turborepo) is set up.
*   Target game for initial migration: `heavens-ten-deluxe`.

**Proposed Refined `engine-core` Structure Snippet (Illustrative):**
```
packages/engine-core/src/
├── components/
│   ├── basic/
│   ├── ui/
│   ├── reels/
│   │   ├── common/      # BaseSymbol, ReelContainer?
│   │   ├── standard/    # StandardReelStrip?
│   │   └── megaways/    # (Future) MegawaysReelStrip?
│   ├── effects/
│   └── layout/
├── hooks/
├── state/
├── features/
│   ├── asset-loading/
│   ├── spin-cycle/    # Logic controlling spin phases
│   │   ├── standard.ts  # Default implementation
│   │   └── index.ts     # Exports/facade
│   ├── win-evaluation/ # Logic for evaluating wins
│   │   ├── line-evaluator.ts # Default implementation
│   │   └── index.ts      # Exports/facade
│   ├── win-presentation/ # Orchestrating win display
│   ├── free-spins/
│   └── ...
├── services/
├── types/ (Engine Internal)
└── index.ts
```
*(Note: Specific strategy implementations might live here or be provided by game packages based on final design)*

---

## Phase 1: Project Foundation & Static Display *(Focus: Structure & Config)*

1.  **Setup Monorepo Structure:**
    *   **Action:** Initialize the monorepo root (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.eslintrc.js`, `.prettierrc.js`). Add `turbo.json` if using Turborepo.
    *   **Location:** Project Root

2.  **Create Core Packages:**
    *   **Action:** Create directories `packages/engine-core`, `packages/game-configs`, `packages/shared-utils`, `packages/games`.
    *   **Location:** `packages/`

3.  **Initialize Packages:**
    *   **Action:** Create basic `package.json` and `tsconfig.json` (extending base) in each package directory.
    *   **Dependencies (`engine-core`):** `react`, `react-dom`, `@pixi/react`, `pixi.js`, `gsap`, `zustand`, `@pixi/particle-emitter` (optional), `pixi-spine` (optional). DevDeps: `typescript`, `@types/react`, etc.
    *   **Dependencies (`games/*`):** List `engine-core`, `game-configs`, `shared-utils` as workspace dependencies. Add `vite`, `@vitejs/plugin-react` as DevDeps.
    *   **Location:** Each package directory (`engine-core`, `game-configs`, etc.)

4.  **Define Configuration Types (`game-configs`):**
    *   **Action:** Create `packages/game-configs/src/types.ts`. Define **detailed and extensible** TS interfaces for all config elements (`SymbolDefinition`, `ReelStripConfig`, `Payline`, `GameSettings` including *mechanic type flags* like `reelType: 'standard' | 'megaways'`, `winEvaluationType: 'lines' | 'ways'`, `AnimationTimings`, `FeatureParameters` etc.). Define interfaces for potential **pluggable strategies** (e.g., `IWinEvaluator`, `ISpinReactor`).
    *   **Location:** `packages/game-configs/src/`

5.  **Migrate Game Config Data (`games/heavens-ten-deluxe-react`):**
    *   **Action:** Create `packages/games/heavens-ten-deluxe-react/src/config/` directory. Copy data from vanilla `src/config/*.js` files into new `.ts` files (`symbols.ts`, `reels.ts`, etc.). Update data to strictly match the interfaces from `game-configs`. Export the typed configuration objects.
    *   **Location:** `packages/games/heavens-ten-deluxe-react/src/config/`

6.  **Migrate Assets (`games/heavens-ten-deluxe-react`):**
    *   **Action:** Copy the entire contents of the vanilla `src/assets/` directory into `packages/games/heavens-ten-deluxe-react/src/assets/`.
    *   **Location:** `packages/games/heavens-ten-deluxe-react/src/`

7.  **Migrate Utilities (`shared-utils`):**
    *   **Action:** Identify generic helper functions in vanilla `src/utils/helpers.js` that *do not* depend on PixiJS or game state. Move them into `packages/shared-utils/src/` (e.g., `math.ts`, `array.ts`). Export them.
    *   **Location:** `packages/shared-utils/src/`

8.  **Game Entry Point (`games/heavens-ten-deluxe-react`):**
    *   **Action:** Create `src/main.tsx`. Set up React root rendering. Import and render the main `<GameContainer>` (or `<StageWrapper>`) component from `engine-core`, passing the specific game config. Create basic `index.html` in `public/` and `vite.config.ts`.
    *   **Location:** `packages/games/heavens-ten-deluxe-react/`

9.  **Core Stage Component (`engine-core`):**
    *   **Action:** Create `src/components/layout/GameContainer.tsx` (or `StageWrapper`). Use `@pixi/react`'s `<Stage>`. Accept **game settings config** for dimensions, background, etc.
    *   **Location:** `packages/engine-core/src/components/layout/`

10. **Asset Loading Hook (`engine-core`):**
    *   **Action:** Create `src/hooks/useAssets.ts`. Implement loading using `PIXI.Assets.loadBundle()` based on asset URLs derived from game config. Provide loading state and textures map.
    *   **Location:** `packages/engine-core/src/hooks/`

11. **Basic Symbol Component (`engine-core`):**
    *   **Action:** Create `src/components/reels/common/BaseSymbol.tsx`. Accept texture ID, position, potentially animation state. Render `<Sprite>`. Keep it relatively simple, anticipating potential wrapping or specialization by game packages later if needed.
    *   **Location:** `packages/engine-core/src/components/reels/common/`

12. **Basic Reel Component (`engine-core`):**
    *   **Action:** Create `src/components/reels/common/ReelContainer.tsx`. Create `src/components/reels/standard/StandardReelStrip.tsx`. `ReelContainer` maps over reel configs, potentially selecting `StandardReelStrip` (or a future `MegawaysReelStrip`) based on `gameSettings.reelType` config. `StandardReelStrip` renders a static strip of `BaseSymbol` components. Design props to accept necessary configuration for standard reels.
    *   **Location:** `packages/engine-core/src/components/reels/`

13. **Initial Scene Assembly (`engine-core`):**
    *   **Action:** Update `GameContainer.tsx` to use `useAssets`. Conditionally render the `<ReelContainer>` component (which internally uses `StandardReelStrip` based on config for this game) once assets loaded.
    *   **Location:** `packages/engine-core/src/components/layout/`

    *   **Milestone 1:** Running `pnpm --filter heavens-ten-deluxe-react dev` displays the static standard slot grid, driven by configuration. Engine components are structured with future variations in mind.

---

## Phase 2: State Management & Basic Spin Animation

1.  **Zustand Store Setup (`engine-core`):**
    *   **Action:** Create `src/state/store.ts`, `initialState.ts`, `actions.ts`, `selectors.ts`. Define core state (`reelSymbols`, `isSpinning`, `balance`, etc.) and basic actions (`startSpin`, `setReelResults`).
    *   **Location:** `packages/engine-core/src/state/`

2.  **Integrate State (`engine-core`):**
    *   **Action:** Create `src/hooks/useGameState.ts` for store access. Update `<Reel>`/`<Symbol>` to display symbols based on `reelSymbols` state.
    *   **Location:** `packages/engine-core/src/hooks/`, `src/components/reels/`

3.  **Basic UI Button (`engine-core`):**
    *   **Action:** Create `src/components/ui/Button.tsx` using `<Sprite>`/`<Graphics>`. Connect onClick to `startSpin` action.
    *   **Location:** `packages/engine-core/src/components/ui/`

4.  **Place Spin Button (`engine-core` / `games/*`):**
    *   **Action:** Create a basic `<UIOverlay>` component in `engine-core`. Render the `<Button>` within it. Include `<UIOverlay>` in the main `StageWrapper`.
    *   **Location:** `packages/engine-core/src/components/ui/`, `src/components/layout/`

5.  **Reel Spin Animation (`engine-core`):**
    *   **Action:** Refactor `<Reel>` component. Use `useEffect` triggered by `isSpinning`. Use GSAP to animate reel container's `y` position. Implement smooth stopping based on `targetStopSymbols` state using GSAP tween. Ensure `onUpdate` correctly positions/swaps visible `<Symbol>` components during animation. (Initially, `targetStopSymbols` can be client-generated).
    *   **Location:** `packages/engine-core/src/components/reels/`

    *   **Milestone 2:** Clicking the Spin button visually spins the reels using GSAP and stops them based on state.

---

## Phase 3: Win Evaluation & Presentation

1.  **Win Evaluation Logic (`engine-core`):**
    *   **Action:** Create `src/features/win-evaluation/line-evaluator.ts`. Implement standard line win logic based on `Payline` config. Create `src/features/win-evaluation/index.ts` to potentially export a `useWinEvaluation` hook that selects the correct evaluator (currently just `line-evaluator`) based on `gameSettings.winEvaluationType` config. Trigger evaluation via Zustand.
    *   **Location:** `packages/engine-core/src/features/win-evaluation/`

2.  **Update Win State (`engine-core`):**
    *   **Action:** Add `winningLinesInfo`, `lastTotalWin` to Zustand store. Update store from evaluator results.
    *   **Location:** `packages/engine-core/src/state/`

3.  **Payline Drawing Component (`engine-core`):**
    *   **Action:** Create `src/components/effects/WinningLinesOverlay.tsx`. Subscribe to `winningLinesInfo`. Use `<Graphics>` `draw` prop to draw lines based on data. Implement helper to get symbol screen positions.
    *   **Location:** `packages/engine-core/src/components/effects/`

4.  **Symbol Win Animation (`engine-core`):**
    *   **Action:** Enhance `<Symbol>` component. Add `isWinning` prop (derived from state/position). Use `useEffect` to trigger a simple GSAP win animation (scale/tint) when `isWinning` is true.
    *   **Location:** `packages/engine-core/src/components/reels/`

5.  **Integrate Overlay (`engine-core`):**
    *   **Action:** Add `<WinningLinesOverlay>` to the main `StageWrapper` rendering logic.
    *   **Location:** `packages/engine-core/src/components/layout/`

    *   **Milestone 3:** Standard winning lines are drawn and symbols animate. Win evaluator is structured for potential future extension (ways, cluster).

---

## Phase 4: UI, Sound & Polish

1.  **Core UI Components (`engine-core`):**
    *   **Action:** Build `TextDisplay.tsx`, `Panel.tsx`. Connect via `useGameState` to display `balance`, `bet`, `lastTotalWin`. Style using Pixi properties.
    *   **Location:** `packages/engine-core/src/components/ui/`

2.  **Assemble UI (`engine-core`):**
    *   **Action:** Arrange UI components within the `<UIOverlay>`.
    *   **Location:** `packages/engine-core/src/components/ui/`

3.  **Sound Integration (`engine-core`):**
    *   **Action:** Implement `src/hooks/useSound.ts` (using Howler.js or similar). Add functions `playSound(soundId)`. Trigger sounds on events (spin click, reel stop, win) via effects or action calls. Load sounds defined in game config.
    *   **Location:** `packages/engine-core/src/hooks/`

4.  **Refine Animations & Timing:**
    *   **Action:** Integrate `animationSettings` config. Implement Turbo Mode state flag and logic affecting GSAP durations/delays. Polish existing animations.
    *   **Location:** Relevant components/hooks in `engine-core`

    *   **Milestone 4:** Core UI displays dynamic data, basic sounds play, animations respect timing configs.

---

## Phase 5: Feature Implementation (Iterative)

*   **For each major feature (Autoplay, Free Spins, etc.):**
    1.  **State:** Define necessary state slices in Zustand (`isAutoplayActive`, `activeFeature`, `freeSpinsRemaining`).
    2.  **Logic:** Implement core logic in hooks (`useAutoplay`, `useFreeSpinsController`) or Zustand actions.
    3.  **Components:** Create specific components (`FreeSpinsOverlay`, `AutoplayUI`) conditionally rendered based on state.
    4.  **Animation:** Implement entry/exit/feature-specific animations using GSAP timelines, triggered by state changes or component mounting. (Follow sequence plan discussed previously for transitions).
    5.  **Config:** Ensure feature relies on game config flags/parameters where appropriate.

---

## Phase 6: Server Integration

1.  **Build `rng-server` Package:**
    *   **Action:** Set up Node.js server (Express/Fastify), define `/spin` endpoint. Implement basic RNG. Use shared types.
    *   **Location:** `packages/rng-server/`

2.  **Implement `ApiService` (`engine-core`):**
    *   **Action:** Create `src/services/ApiService.ts` using `fetch`. Implement `requestSpin` function.
    *   **Location:** `packages/engine-core/src/services/`

3.  **Refactor Spin Cycle:**
    *   **Action:** Modify `startSpin` action to call `ApiService`. On response, update Zustand store with authoritative `targetStopSymbols`, `winningLinesInfo`, `balance`, etc. Ensure client-side rendering reacts correctly to this server data.
    *   **Location:** `packages/engine-core/src/state/actions.ts`

---

## Phase 7: Testing & Optimization

1.  **Unit/Integration Tests:**
    *   **Action:** Add tests (Jest/Vitest) for hooks, services, state logic, utility functions.
    *   **Location:** Within each package (`__tests__` folders).

2.  **Component Tests:**
    *   **Action:** Add tests for React components using React Testing Library (potentially with adaptations for Pixi).
    *   **Location:** Within `engine-core` primarily.

3.  **Profiling & Optimization:**
    *   **Action:** Use browser and React dev tools to identify performance bottlenecks. Optimize Pixi rendering (batching, textures), GSAP usage, and React component re-renders (`React.memo`, selectors).
    *   **Location:** Across `engine-core` and potentially game packages.

4.  **Documentation & Cleanup:**
    *   **Action:** Add READMEs to packages, document core components/hooks. Refactor and clean up code.
    *   **Location:** Throughout the monorepo.

---
