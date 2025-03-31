# V2 Slot Engine: Feature Development Guide

This guide outlines patterns and best practices for implementing game features within the V2 engine architecture, distinguishing between features reusable across multiple games (implemented in `engine-core`) and features unique to a specific game (implemented in a `games/*` package).

## 1. Philosophy: Engine vs. Game Features

*   **Engine Features (`engine-core`):** These are common slot game functionalities or systems that are expected to be used, with configuration variations, across multiple games. Examples: Standard Free Spins, Autoplay, Turbo Mode, Basic Win Presentation, Line/Ways Evaluation, Feature Buy Framework.
    *   **Implementation:** Primarily as hooks, state slices/actions in Zustand, and potentially reusable UI components within `engine-core`.
    *   **Goal:** Provide a generic, configurable implementation.
*   **Game Features (`games/*`):** These are mechanics, bonus rounds, or visual elements unique to a specific game title. Examples: A specific symbol collection mechanic (Big Bass), unique pick-me bonus screen (Wanted DOA), tumbling reels with multipliers (Sweet Bonanza - core tumbling *might* be engine, but multiplier logic might be game-specific).
    *   **Implementation:** As hooks, components, and state management logic *within* the specific `games/[game-name]` package.
    *   **Goal:** Implement unique game identity, leveraging `engine-core` tools.

## 2. Patterns for Reusable Engine Features (`engine-core`)

1.  **State Management (Zustand):**
    *   Define necessary state slices in `engine-core/src/state/store.ts` (e.g., `freeSpinsRemaining`, `isAutoplayActive`, `activeFeature`).
    *   Create actions to manage this state (e.g., `enterFreeSpins`, `decrementFreeSpin`, `toggleAutoplay`).
    *   Provide selectors via `useGameState` for components to react to feature state.
2.  **Configuration (`game-configs` & Consumption):**
    *   Define feature parameters in `game-configs/src/types.ts` (e.g., `FreeSpinsParameters`, `FeatureBuyOption`).
    *   Engine feature logic reads these parameters from the game configuration object (passed down via props or accessed via state) to tailor its behavior (e.g., number of spins awarded, feature buy cost).
    *   Use feature flags in `GameSettings` (e.g., `hasFreeSpins`) to enable/disable the feature entirely for a game.
3.  **Logic Hooks (`engine-core/src/features/`):**
    *   Encapsulate the core reusable logic within custom hooks (e.g., `useFreeSpinsController`, `useAutoplayController`).
    *   These hooks interact with the Zustand store and may orchestrate animations or sound via other engine hooks.
4.  **Reusable UI Components (`engine-core/src/components/`):**
    *   Create generic UI components needed by the feature (e.g., a basic `<FeatureOverlayPanel>`, `<SpinCounterDisplay>`). Style and content should be configurable where possible.
5.  **Animation & Sound:**
    *   Implement standard entry/exit animations or core feature animations using GSAP within the feature's logic hooks or associated components.
    *   Trigger generic sounds (`playSound('featureEnter')`) via `useSound`.
    *   Allow configuration (`AnimationTimings`, `SoundConfig`) to customize timings and specific sound assets.
6.  **Extensibility Points:**
    *   Design hooks/components to accept optional callback props or render props for game-specific overrides (e.g., `onFreeSpinsComplete?: () => void`, `renderBonusSymbol?: (...) => ReactNode`).
    *   For fundamentally different mechanics (win eval, spin cycle), define strategy interfaces in `game-configs` and implement default strategies in `engine-core`, allowing games to provide alternatives (see Section 4).

## 3. Patterns for Game-Specific Features (`games/*`)

1.  **Location:** All code (components, hooks, styles, specific state logic) resides within the `packages/games/[game-name]/src/` directory, typically under `components/[feature-name]/` and `features/[feature-name]/`.
2.  **Configuration:** Define any necessary configuration specific to this feature within the game's `src/config/features.ts` or `settings.ts`, potentially extending interfaces from `game-configs` if needed.
3.  **State Management:**
    *   **Primary:** Leverage the main engine Zustand store (`useGameState`) for interacting with core game state (e.g., reading `reelResults`, triggering engine actions like `awardWin`).
    *   **Feature-Specific State:** If the feature has complex internal state not needed by the engine, either:
        *   Use local React state (`useState`, `useReducer`) within the feature's components (simpler).
        *   Create a dedicated Zustand slice *specifically for that game* (more complex setup, potentially using middleware or separate stores if isolation is critical). Avoid adding purely game-specific state slices directly to the main `engine-core` store.
4.  **Components:**
    *   Build feature-specific UI components within the game package.
    *   Utilize reusable basic components (`Button`, `TextDisplay`, `Panel`) from `engine-core` for consistency.
    *   Conditionally render these components from the game's main App component or relevant screen container based on engine state (`activeFeature` flag set by the engine).
5.  **Logic Hooks:**
    *   Create custom hooks within the game package (`src/features/[feature-name]/`) to encapsulate the feature's unique logic.
    *   These hooks interact with `useGameState` and potentially game-specific state.
    *   They trigger engine sounds (`useSound`) and orchestrate game-specific animations (using GSAP, potentially leveraging engine animation utilities).
6.  **Integration:**
    *   Trigger the feature based on conditions evaluated within the game logic (often by observing engine state like `reelResults` or `winningLinesInfo`) or via specific engine hooks/callbacks designed for extensibility.
    *   Update the engine's state (`activeFeature`, `balance`, etc.) via standard engine actions when the feature starts, progresses, or ends.

## 4. Handling Complex Mechanics (Tumbling, Megaways, Collection)

These often require adjustments in both `engine-core` (to provide the *capability*) and `games/*` (to provide the *specifics*).

1.  **Define Mechanic Type (Config):** `GameSettings.reels.mechanism` (`tumbling`, `megaways`), `GameSettings.winEvaluation.mechanism` (`ways`, `cluster`) are set by the game.
2.  **Engine Core Adaptations:**
    *   **Spin Cycle (`engine-core/src/features/spin-cycle/`):** Needs logic branches or pluggable strategies (`ISpinReactor`?) to handle different reactions after a win. A `TumblingReactor` would handle symbol removal, dropping new symbols, and triggering re-evaluation, while a `StandardReactor` would simply transition to idle.
    *   **Win Evaluation (`engine-core/src/features/win-evaluation/`):** Needs different evaluator implementations (`WaysEvaluator`, `ClusterEvaluator`) selected based on config (`IWinEvaluator` strategy pattern is ideal here).
    *   **Reel Components (`engine-core/src/components/reels/`):** May need specific components (`MegawaysReelStrip`) or highly configurable standard components capable of handling variable symbol heights or grid-based layouts, selected by config.
3.  **Game Specific Logic:**
    *   **Tumbling Multipliers (Sweet Bonanza):** The *base* tumbling logic is in the engine's `TumblingReactor`. The game-specific logic (hook/component in `games/sweet-bonanza/`) would observe the tumbles and specifically manage the multiplier symbols during Free Spins, modifying the final win amount reported by the engine's evaluator.
    *   **Symbol Collection (Big Bass):** The engine provides the Free Spins framework. The game (`games/big-bass-splash/`) provides a specific hook (`useFishermanCollection`) that runs *during* the engine's Free Spins state, observes engine state (`reelResults`), implements the collection/progression logic, and calls engine actions to award extra spins or update win totals.

**Key Takeaway:** Design `engine-core` to handle the common *structure* and *state transitions* for different mechanics, selectable by config. Implement the *unique rules, calculations, and UI* specific to a game feature within the game's own package, interacting with the engine's state and components. Use composition and potentially strategy patterns to bridge the generic engine and specific game needs.
