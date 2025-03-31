# V2 Slot Engine: Engine Core Deep Dive

This document provides a detailed look into the structure, components, hooks, and patterns within the `packages/engine-core` package. This package contains the reusable frontend logic and presentation layer for all slot games.

## 1. Directory Structure & Philosophy

*(Illustrative Structure - Subject to refinement during implementation)*
```
packages/engine-core/src/
├── components/       # Reusable React components wrapping PixiJS via @pixi/react
│   ├── basic/        # Primitives (ManagedSprite, ManagedContainer, etc.)
│   ├── ui/           # UI elements (Button, TextDisplay, Panel, Meter)
│   ├── reels/        # Reel structure/presentation (ReelContainer, BaseSymbol, StandardReelStrip)
│   ├── effects/      # Visual effects (WinningLinesOverlay, ParticleEmitterWrapper, AnimatedSprite)
│   └── layout/       # Stage/screen layout (GameContainer, ScaledContainer)
├── hooks/            # Reusable React Hooks for logic and side effects
│   ├── useGameState.ts
│   ├── useAssets.ts
│   ├── useGameLoop.ts
│   ├── useAnimation.ts    # Base animation hook(s)
│   ├── useSound.ts
│   └── ...            # Hooks related to specific features (useSpinCycle, useWinPresentation?)
├── state/            # Zustand global state management
│   ├── store.ts
│   ├── initialState.ts
│   ├── actions/
│   ├── selectors/
│   └── types.ts       # State-specific types
├── features/         # Logic modules/hooks for REUSABLE game phases/systems
│   ├── asset-loading/
│   ├── spin-cycle/    # Spin start/stop/reaction logic
│   ├── win-evaluation/ # Core win calculation logic (pluggable evaluators)
│   ├── win-presentation/ # Orchestrating win display sequences
│   ├── free-spins/    # Framework/controller for Free Spins mode
│   ├── autoplay/
│   └── ...
├── services/         # Non-React logic (plain TS classes/functions)
│   ├── ApiService.ts
│   ├── SoundManager.ts  # Lower-level sound library integration
│   └── ...
├── types/            # Engine-internal TypeScript definitions (distinct from game-configs)
│   └── index.ts
├── contexts/         # React Context (minimal use, e.g., Pixi App instance if needed)
│   └── PixiAppContext.ts
└── index.ts          # Public API exports of the engine package
```

**Philosophy:**
*   **Maximize Reusability:** Components and hooks should be generic enough to serve multiple games, driven by configuration.
*   **Mobile-First Performance:** Design components and logic with mobile performance (CPU, GPU, memory) as a primary consideration.
*   **Encapsulation:** Components encapsulate specific pieces of UI or visual representation. Hooks encapsulate specific logic or side effects.
*   **Configuration Driven:** Avoid hardcoding game-specific values. Rely on props passed down from the game package, originating from the game's configuration files.
*   **State Management:** Use the central Zustand store (`useGameState`) for all shared application state. Avoid local React state (`useState`) for data needed across different components or features.

## 2. Core Components (`src/components/`)

Components in `engine-core` are React components that ultimately render PixiJS objects using `@pixi/react`. Performance and mobile adaptability are key design goals. **A core principle is enabling visual customization through composition and props.**

*   **`layout/GameContainer.tsx`**: The top-level component. Receives the main game config. Initializes context, loads assets via `useAssets`, sets up the `@pixi/react` `<Stage>`. Renders core layout sections. Handles base responsiveness. **Props should allow injecting game-specific components like `backgroundComponent`, `introScreenComponent`, `uiOverlayComponent`.**
*   **`layout/ScaledContainer.tsx`**: Handles responsive scaling.
*   **`reels/ReelContainer.tsx`**: Arranges reels based on config. Selects reel strip component (`StandardReelStrip`, `MegawaysReelStrip` etc.) based on config. **Crucially, passes down a `renderSymbol` prop to the chosen reel strip component.**
*   **`reels/standard/StandardReelStrip.tsx`**: Renders a standard reel. Handles symbol masking/swapping. Contains standard spin animation logic (GSAP). **Uses the `renderSymbol` prop received from `ReelContainer` to render each symbol instance.**
*   **`reels/common/BaseSymbol.tsx`**: **The default symbol renderer.** Renders a `<Sprite>`. Handles basic state (`isWinning`, `isDimmed`) and basic animations. Used if a game doesn't provide a custom `renderSymbol` function.
*   **`ui/Button.tsx`**: Reusable button. Must be performant, handle touch. Visuals potentially customizable via props (texture keys, style objects).
*   **`ui/TextDisplay.tsx`**: Renders text. Consider performance.
*   **`effects/WinningLinesOverlay.tsx`**: Renders winning lines via `<Graphics>`. **Could potentially accept a `renderLineGraphic?: (graphics: PIXI.Graphics, lineData: LineInfo) => void` prop for custom line drawing styles.**
*   **`effects/ParticleEmitterWrapper.tsx`**: Wrapper for `pixi-particles`.
*   **`effects/AnimatedSprite.tsx`**: Wrapper for `PIXI.AnimatedSprite`.
*   **Other UI/Layout Components (`Panel`, `Meter`, `UIOverlay`):** Should be designed composably, potentially accepting `children` or specific component props to allow games to customize content and layout.

## 3. Core Hooks (`src/hooks/`)

Hooks encapsulate reusable logic, state access, and side effects.

*   **`useGameState.ts`**: **Crucial for performance.** Emphasize use of narrow selectors to prevent unnecessary component re-renders.
*   **`useAssets.ts`**: **Handle efficient loading and unloading** of assets. Support for texture atlases is essential for performance.
*   **`useGameLoop.ts`**: **Logic within callbacks must be highly optimized** to avoid impacting frame rate, especially on mobile.
*   **`useAnimation.ts`**: Provides utilities. **May include hooks designed to work with game-specific animation definitions passed via config or props.**
*   **`useSound.ts`**: Provides functions like `playSound(soundId)`, `stopSound(soundId)`, `setMusic(musicId)`. Manages loading (via `useAssets`) and playback using a sound library integrated in `services/SoundManager.ts`.

## 4. State Management (`src/state/`)

*   **Technology:** Zustand.
*   **`store.ts`**: Defines the main store using `create()`. Includes state properties and actions that modify the state.
*   **`initialState.ts`**: Defines the default values for the state slices.
*   **Structure:** Organize the state logically (e.g., `gameState`, `playerState`, `reelState`, `featureState`).
*   **Actions (`actions/` or inline):** Functions that encapsulate state update logic (`setState`). Should be the *only* way mutable state is changed.
*   **Selectors (`selectors/` or inline with `useGameState`):** Functions used in `useStore` calls to select specific, memoized pieces of state, ensuring components only re-render when necessary.
*   **Middleware:** Zustand middleware (like `devtools`, `subscribeWithSelector`, `persist`) can be used for debugging, reacting to state changes outside of components, or persistence if needed.

## 5. Feature Implementation Patterns (`src/features/`)

This directory contains the logic for core, reusable game systems or phases.

*   **Structure:** Typically implemented as custom hooks (e.g., `useSpinCycle`, `useWinEvaluation`, `useFreeSpinsController`) or potentially plain TS modules/classes if no React hooks are needed.
*   **Interaction:** These features interact heavily with the Zustand store (reading state, calling actions) and may trigger animations or sound via the respective hooks.
*   **`spin-cycle/`**: Manages the overall state transitions of a spin (Idle -> Spinning -> Stopping -> Evaluating -> Presenting Win -> Idle). It likely orchestrates calls to `ApiService`, updates `isSpinning` state, and triggers win evaluation.
*   **`win-evaluation/`**: Contains the logic for calculating wins based on `reelResults` state and game config. Designed to be pluggable (e.g., selecting `line-evaluator` or `ways-evaluator` based on config).
*   **`win-presentation/`**: Orchestrates the sequence of displaying wins after evaluation (e.g., showing lines, animating symbols, rolling up win amount). Often involves complex GSAP timelines triggered by `winningLinesInfo` state changes.
*   **`free-spins/`**: Contains the hook (`useFreeSpinsController`?) that manages the state specific to Free Spins mode (remaining spins, accumulated win, potentially feature-specific modifiers like multipliers or symbol collection progress). Handles automatic triggering of spins within the mode.
*   **Extensibility Points:** Hooks controlling features (like `useFreeSpinsController` or `useWinPresentation`) should be designed to accept optional props containing **custom animation functions or React components** provided by the game package. Example: `useFreeSpinsController({ onEnterTransition?: () => Promise<void>, onExitTransition?: () => Promise<void> })` allowing the game to define its own GSAP sequences for entering/exiting the mode.

## 6. Animation System (GSAP Integration)

*   **Core Tool:** GSAP v3.
*   **Integration:** Primarily via `useEffect` hooks in React components.
*   **Targeting:** Use `useRef` on `@pixi/react` components to get references to the underlying Pixi display objects, which GSAP can then target.
*   **Timelines:** Use `gsap.timeline()` extensively for sequencing complex animations (reel stops, win presentations, feature transitions).
*   **Control:** Store timeline instances if needed for pausing, resuming, or killing animations. Ensure proper cleanup in `useEffect` return functions.
*   **Configuration:** GSAP durations, delays, and eases should be driven by `AnimationTimings` configuration passed down as props or accessed from state.
*   **Game-Specific Animations:** Complex, unique animations (especially for symbols or feature transitions) are implemented primarily:
    *   Within **custom symbol components** provided by the game package (using the `renderSymbol` prop pattern).
    *   Within **game-specific feature components** (e.g., bonus screens).
    *   Via **custom animation functions/components** passed as props to engine hooks/components designed with extensibility points.

## 7. Configuration Consumption

*   **Entry Point:** The top-level `<GameContainer>` receives the full, typed game configuration object from the specific `games/*` package.
*   **Distribution:** Config values passed via props. **This includes passing game-specific rendering functions (like `renderSymbol`) or component types (like `backgroundComponent`) down the component tree.**
*   **Type Safety:** TypeScript ensures that components and hooks receive configuration matching the interfaces defined in `game-configs`.
