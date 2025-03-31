# Roadmap: Phase 7 - Engine Feature Enhancements

**Reference Docs:**
*   `docs/v2/05-feature-development-guide.md` (Engine Feature Patterns)
*   `docs/v2/02-engine-core-deep-dive.md` (Features, State)
*   `docs/v2/03-configuration-system.md` (Feature Parameters)
*   `docs/v2/08-server-integration.md` (API Contract for Features)

**Goal:** Implement core, reusable engine features (like Standard Free Spins, Autoplay, Turbo Mode, Feature Buy framework) within `engine-core`. Crucially, ensure these features integrate correctly with the `game-server` for authoritative state management and triggering.

**Prerequisites:**
*   Phase 6 (First Game MVP) Completed. A standard game is playable with server results.
*   The `game-server` backend is ready to support the state management and triggering logic for the features being implemented in this phase (requires concurrent backend development).

**Outcome:**
*   `engine-core` provides configurable, reusable implementations for common slot features.
*   The features function correctly, relying on the `game-server` for triggering, state tracking (e.g., free spins remaining), and results.
*   The first MVP game (`heavens-ten-deluxe-react`) can be configured to use these features.

**Key Steps & Tasks (Iterative per Feature):**

*(Example: Implementing Standard Free Spins Framework)*

1.  **Define Config (`game-configs`):**
    *   `[Task]` Finalize the `FreeSpinsParameters` interface in `types.ts`, including trigger conditions, spins awarded, retrigger logic, etc.
2.  **Engine State (`engine-core`):**
    *   `[Task]` Add necessary state slices to Zustand store: `freeSpinsAwarded`, `freeSpinsRemaining`, `freeSpinsTotalWin`, potentially `activeSubFeature` (for internal FS states).
    *   `[Task]` Add actions: `triggerFreeSpins(awarded)`, `startFreeSpinsMode`, `decrementFreeSpin`, `completeFreeSpins`, `addFreeSpinsWin(amount)`.
3.  **Server Integration (`engine-core` & `game-server`):**
    *   `[Task]` Define API contract: How does the `SpinResult` indicate FS trigger? How does server track `freeSpinsRemaining`? Does client need to notify server on FS completion?
    *   `[Task]` Update `ApiService` if new endpoints/payload fields are needed.
    *   `[Task]` Ensure server correctly identifies FS triggers and includes trigger info in `SpinResult`.
    *   `[Task]` Ensure server correctly manages `freeSpinsRemaining` state (if server-authoritative) or accepts updates from client if needed.
4.  **Feature Logic Hook (`engine-core`):**
    *   `[Task]` Implement `useFreeSpinsController` hook (`src/features/free-spins/`).
        *   Reads FS config from `gameConfiguration.featureParameters`.
        *   Observes engine state (`triggeredFeature`, `reelResults`, etc.) to detect trigger conditions (often redundant if server signals trigger).
        *   Calls Zustand actions (`triggerFreeSpins`, `startFreeSpinsMode`) based on server signals or client detection.
        *   Manages the flow *within* free spins: automatically triggers spins via `startSpin` action when appropriate, decrements `freeSpinsRemaining`.
        *   Handles re-triggers based on config and server results.
        *   Calls `completeFreeSpins` action when `freeSpinsRemaining` reaches zero.
        *   Accumulates `freeSpinsTotalWin`.
5.  **UI Components (`engine-core`):**
    *   `[Task]` Implement reusable UI components like `<FreeSpinsCounter>` (displays remaining spins), `<FreeSpinsTotalWinDisplay>`.
    *   `[Task]` Implement a basic `<FreeSpinsIntroPanel>` and `<FreeSpinsOutroPanel>` component (configurable content).
6.  **Animation & Presentation (`engine-core`):**
    *   `[Task]` Implement default transition animations for entering/exiting FS mode (using GSAP, potentially via the `useFreeSpinsController` hook).
    *   Allow games to override transitions via props passed to the controller hook (as per docs).
    *   Integrate FS-specific sounds (`useSound`).
7.  **Integration in Game (`games/heavens-ten-deluxe-react`):**
    *   `[Task]` Update the game's config (`features.ts`) to include `FreeSpinsParameters`.
    *   `[Task]` Ensure the game's main component conditionally renders FS UI components based on `activeFeature === 'freeSpins'` state.
    *   `[Task]` Test the feature thoroughly with server interaction.

*(Repeat similar steps for Autoplay, Turbo Mode, Feature Buy Framework)*

*   **Autoplay:** State (`isAutoplayActive`, `autoplaySpinsRemaining`), Logic Hook (`useAutoplayController`), UI integration (start/stop buttons, display).
*   **Turbo Mode:** State (`isTurboMode`), UI toggle, conditional logic in animation hooks/components to use different timings from config.
*   **Feature Buy:** Config (`FeatureBuyOption[]`), UI component to display options, Action to trigger purchase (likely involves server call), State update to directly trigger the bought feature (e.g., Free Spins).

**Definition of Done:**
*   Core reusable features (FS, Autoplay, Turbo, Feature Buy Framework) are implemented in `engine-core`.
*   Features correctly integrate with the `game-server` for triggering and state management.
*   Features are configurable via `game-configs` interfaces.
*   The MVP game (`heavens-ten-deluxe-react`) demonstrates successful integration and usage of these configured features.
*   Unit tests for feature logic hooks and actions pass.
*   Integration tests (manual and potentially automated) verify client-server feature interaction.

**Tracking:**
*   Create tickets for each feature implementation (client and corresponding server tasks).
*   Track progress, manage dependencies between client/server work.
*   Code reviews for feature logic and server integration points.
*   Phase gate review: Demonstrate each engine feature working correctly with the server in the context of the MVP game.
