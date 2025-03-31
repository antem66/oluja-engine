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

Components in `engine-core` are React components that ultimately render PixiJS objects using `@pixi/react` components (`<Stage>`, `<Container>`, `<Sprite>`, `<Graphics>`, `<Text>`, etc.). **Performance and mobile adaptability are key design goals.**

*   **`layout/GameContainer.tsx`**: The top-level component rendered by the game entry point. Receives the main game config. Initializes context, loads assets via `useAssets`, sets up the `@pixi/react` `<Stage>`, and renders core layout sections (reels area, UI overlay, feature overlays). **Handles base responsiveness setup.**
*   **`layout/ScaledContainer.tsx`**: (Optional but Recommended) A helper component for handling **responsive scaling** of game elements (e.g., scaling down the main game area while preserving aspect ratio on smaller/different ratio screens).
*   **`reels/ReelContainer.tsx`**: Responsible for arranging the individual reels based on game config. Performance consideration: efficiently manages reel component rendering.
*   **`reels/standard/StandardReelStrip.tsx`**: Renders a standard fixed-height reel. **Must efficiently handle symbol swapping/masking during spins.**
*   **`reels/common/BaseSymbol.tsx`**: Renders a single symbol using `<Sprite>`. **Minimize component overhead.** Simple state changes (like `isWinning`) should ideally translate to minimal prop changes.
*   **`ui/Button.tsx`**: A reusable button component. **Must be performant and handle touch events reliably.** Visual states should be optimized (e.g., texture swapping vs. filters).
*   **`ui/TextDisplay.tsx`**: Renders dynamic text using `@pixi/react` `<Text>`. **Consider performance implications of frequent updates** or complex text formatting. BitmapText might be an alternative for performance-critical static labels.
*   **`effects/WinningLinesOverlay.tsx`**: Renders winning paylines using `<Graphics>`. **Optimize drawing logic.** Avoid unnecessary redraws. Consider clearing/redrawing vs. managing multiple Graphics objects.
*   **`effects/ParticleEmitterWrapper.tsx`**: **Performance is critical.** Ensure particle counts and emitter settings are configurable and reasonable for mobile targets. Efficiently manages emitter updates via `useTick`.
*   **`effects/AnimatedSprite.tsx`**: Optimize texture swapping for frame-by-frame animations.

## 3. Core Hooks (`src/hooks/`)

Hooks encapsulate reusable logic, state access, and side effects.

*   **`useGameState.ts`**: **Crucial for performance.** Emphasize use of narrow selectors to prevent unnecessary component re-renders.
*   **`useAssets.ts`**: **Handle efficient loading and unloading** of assets. Support for texture atlases is essential for performance.
*   **`useGameLoop.ts`**: **Logic within callbacks must be highly optimized** to avoid impacting frame rate, especially on mobile.
*   **`useAnimation.ts`**: Could be a collection of hooks or a single hook providing utilities for common GSAP animations. Examples:
    *   `useSimpleTween(targetRef, props, condition)`: Hook to run a simple GSAP tween when a condition is met.
    *   May contain reusable timeline definitions for things like symbol pulses, fades, etc.
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

## 6. Animation System (GSAP Integration)

*   **Core Tool:** GSAP v3.
*   **Integration:** Primarily via `useEffect` hooks in React components.
*   **Targeting:** Use `useRef` on `@pixi/react` components to get references to the underlying Pixi display objects, which GSAP can then target.
*   **Timelines:** Use `gsap.timeline()` extensively for sequencing complex animations (reel stops, win presentations, feature transitions).
*   **Control:** Store timeline instances if needed for pausing, resuming, or killing animations. Ensure proper cleanup in `useEffect` return functions.
*   **Configuration:** GSAP durations, delays, and eases should be driven by `AnimationTimings` configuration passed down as props or accessed from state.

## 7. Configuration Consumption

*   **Entry Point:** The top-level `<GameContainer>` receives the full, typed game configuration object from the specific `games/*` package.
*   **Distribution:** Configuration values are passed down through props to relevant components and hooks. Alternatively, frequently needed global settings (like `isTurboMode` derived from config + state) might be accessed via `useGameState` selectors.
*   **Type Safety:** TypeScript ensures that components and hooks receive configuration matching the interfaces defined in `game-configs`.
