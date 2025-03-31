# V2 Slot Engine: Architecture Overview

## 1. Monorepo Structure

The engine utilizes a monorepo structure managed by pnpm workspaces and **Turborepo**. Turborepo provides intelligent build caching, task orchestration, and simplified commands across packages, significantly improving development velocity and CI/CD efficiency.

```
/your-monorepo-root/
├── package.json            # Root config, defines workspaces
├── pnpm-workspace.yaml     # pnpm config
├── turbo.json              # ★ Turborepo configuration ★
├── tsconfig.base.json      # Shared TS config
├── .eslintrc.js            # Root ESLint config
├── .prettierrc.js          # Root Prettier config
├── docs/
│   └── v2/                 # Engine documentation (this)
└── packages/
    ├── 🚀 engine-core/        # ★ The Reusable React+Pixi Engine Core ★
    ├── ⚙️ game-configs/       # Shared TypeScript TYPES/Interfaces/Schemas for Game Configs
    ├── 🛠️ shared-utils/       # Generic JS/TS Utilities (No React/Pixi specific code)
    ├── 🎮 games/              # Container for individual playable Game Packages
    │   ├── game-one/         # Example Game 1
    │   └── game-two/         # Example Game 2
    └── 📦 game-server/         # ★ Backend Game Server (Node.js) ★
```

## 2. Package Responsibilities

*   **`engine-core`**: The heart of the frontend engine.
    *   Contains reusable React components wrapping PixiJS objects via `@pixi/react` (e.g., Stage, Reel, Symbol, Button, Effects).
    *   Provides core React hooks for managing assets (`useAssets`), game loop (`useGameLoop`), state (`useGameState`), animations (`useAnimation`).
    *   Houses the central Zustand state store definition and core actions/selectors.
    *   Implements the logic for core, reusable game features and systems (e.g., base spin cycle, standard win presentation, free spins controller framework).
    *   Handles integration with GSAP for animations.
    *   Provides services like `ApiService` for server communication.
    *   **Crucially, it's designed to be driven by configuration provided by the active `games/*` package.**

*   **`game-configs`**: Defines the "language" for configuring games.
    *   Contains **only** TypeScript interfaces, types, and potentially validation schemas (e.g., using Zod).
    *   Defines the strict structure for all configuration aspects: game settings, symbol properties, reel layouts (standard, Megaways), paylines/ways, feature parameters, animation timings, asset manifests, etc.
    *   Ensures type safety and consistency across the engine and all game packages.

*   **`shared-utils`**: Generic helper functions.
    *   Contains plain TypeScript/JavaScript utility functions (math helpers, array functions, string manipulation, etc.) that are framework-agnostic (no React, Pixi, or engine-specific logic).
    *   Can be used by any other package, including `engine-core`, `games/*`, and `game-server`.

*   **`games/[game-name]`**: Individual, playable slot game implementations.
    *   **Provides the specific configuration values** implementing the interfaces defined in `game-configs` (e.g., `symbols.ts`, `reels.ts`, `settings.ts`).
    *   Contains **all game-specific assets** (images, sounds, spritesheets, Spine files) in its `src/assets/` directory.
    *   Implements **game-specific React components** (e.g., unique bonus round UIs, special symbol variants) that utilize components and hooks from `engine-core`.
    *   Implements **game-specific feature logic** (hooks or services) for features unique to that game (e.g., a symbol collection mechanic, a specific bonus game interaction).
    *   Contains the main game entry point (`main.tsx`) which initializes React and renders the core engine components, passing its specific configuration.
    *   Has its own build configuration (`vite.config.ts`).

*   **`game-server`**: The backend authority (conceptual - implementation details TBD).
    *   Typically a Node.js application (e.g., using Express, Fastify).
    *   Manages player sessions, state persistence (balance, game state).
    *   Handles player actions (bets, spin requests).
    *   **Contains the Random Number Generator (RNG) logic** to determine game outcomes.
    *   Performs win calculations based on RNG results and game configurations.
    *   Communicates with the client (`engine-core` via `ApiService`) using a defined API contract (likely REST or WebSockets).
    *   Can potentially use types/interfaces from `game-configs` or a dedicated `shared-types` package for API payloads.

## 3. High-Level Data & Rendering Flow (Client - `engine-core` + `games/*`)

1.  **Initialization (`games/[game-name]/main.tsx`):**
    *   Game entry point imports its specific configurations and assets manifest.
    *   Renders the main `<GameContainer>` component from `engine-core`, passing the configuration.

2.  **Engine Initialization (`engine-core/GameContainer`):**
    *   Receives game configuration.
    *   Uses `useAssets` hook to load assets specified in the config.
    *   Initializes the Zustand state store with defaults and configuration parameters.
    *   Renders the main `@pixi/react` `<Stage>` component.

3.  **Scene Composition (`engine-core` Components):**
    *   Components like `<ReelContainer>`, `<UIOverlay>` are rendered within the Stage.
    *   These components use hooks (`useGameState`, `useAssets`) to get necessary data and configuration.
    *   They render other `@pixi/react` components (`<Container>`, `<Sprite>`, `<Graphics>`, `<Text>`) declaratively, composing the visual scene graph.
    *   Specialized components (e.g., `<StandardReelStrip>`, `<Symbol>`) handle specific rendering based on config and state.

4.  **State Changes (Zustand -> React -> Pixi):**
    *   User interaction (e.g., Spin Button click) or game logic triggers a Zustand action.
    *   The Zustand store updates its state.
    *   Components subscribed to the changed state slice via `useStore` selectors re-render.
    *   React's reconciliation determines the necessary changes to the component tree.
    *   `@pixi/react` translates these component prop changes into imperative updates on the underlying PixiJS display objects (e.g., changing Sprite texture, updating Text content, modifying Container position).

5.  **Animation (GSAP):**
    *   State changes or component lifecycle events trigger `useEffect` hooks.
    *   These effects use GSAP to create tweens or timelines, often targeting PixiJS display object properties directly via refs (`useRef`). GSAP updates these properties outside the standard React render cycle for smooth animation.

6.  **Game Loop (`useGameLoop` / `useTick`):**
    *   The `useTick` hook (wrapped by `useGameLoop`) allows registering functions to be called on every PixiJS ticker frame.
    *   Used for time-sensitive updates that don't necessarily involve React state changes (e.g., updating particle emitters, custom shader uniforms).

7.  **Server Communication (`ApiService`):**
    *   Core game actions (like initiating a spin) trigger calls to the `ApiService`.
    *   `ApiService` sends requests to the `game-server`.
    *   Responses from the `game-server` (containing RNG results, new balance, etc.) trigger Zustand actions to update the client's state, driving the visual presentation of the outcome.

**Mobile & Performance Considerations in Flow:**
*   **Asset Loading:** Optimized asset bundles (e.g., texture atlases) are crucial for mobile loading times and memory usage. `useAssets` should handle this efficiently.
*   **Rendering:** Engine components must be mindful of draw calls and GPU cost. Techniques like sprite batching (often handled automatically by PixiJS/React-Pixi to some extent) and minimizing complex filters are important.
*   **Responsiveness:** Layout components (`GameContainer`, `ScaledContainer`) need to adapt the presentation to different screen aspect ratios and resolutions typical of mobile devices. Input handling must prioritize touch events.
*   **State Updates:** Efficient state selection (Zustand selectors) minimizes unnecessary React re-renders, crucial for conserving battery and CPU on mobile.
*   **Game Loop:** Logic within `useGameLoop` must be lean to avoid draining CPU.

This architecture provides a clear flow where configuration dictates setup, Zustand manages state, React declaratively builds the scene via `@pixi/react`, GSAP handles complex animations, and the `game-server` provides authoritative results, with performance and mobile considerations integrated throughout the implementation.

## 4. Build & Deployment Context

*   **Build Process:** Each game package (`games/*`) is built independently using Vite (orchestrated via `pnpm` scripts and potentially `turbo run build`). This produces an optimized, static set of HTML, CSS, and JavaScript assets in the game package's `dist` directory.
*   **Deployment:** The build output (`dist` folder) for each game is typically deployed to static web hosting (e.g., AWS S3/CloudFront, Vercel, Netlify, Azure Static Web Apps) or integrated into a larger platform/portal.
*   **Environment Configuration:** The client might need environment-specific configuration (e.g., API endpoint URLs for staging vs. production). This is typically handled via environment variables during the build process (using Vite's `env` support) or loaded dynamically at runtime from a configuration file or endpoint.
*   **Game Server Deployment:** The `game-server` package is deployed separately as a Node.js application (e.g., to container services like Docker/Kubernetes, serverless functions, or traditional VMs).
