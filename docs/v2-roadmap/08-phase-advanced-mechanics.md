# Roadmap: Phase 8 - Advanced Mechanic Support

**Reference Docs:**
*   `docs/v2/05-feature-development-guide.md` (Handling Complex Mechanics)
*   `docs/v2/03-configuration-system.md` (Config for Mechanics)
*   `docs/v2/02-engine-core-deep-dive.md` (Pluggable Strategies, Components)

**Goal:** Extend the `engine-core` and `game-server` **concurrently** to support diverse core game mechanics beyond standard lines/reels, such as Tumbling/Cascading reels, Ways/Cluster Pays evaluation, and potentially Megaways-style reel structures.

**Prerequisites:**
*   Phase 7 (Engine Feature Enhancements) Completed. Core features work with server integration.
*   Clear design specifications and math models for the target advanced mechanics.
*   Backend team ready to implement corresponding server-side logic (RNG, state, evaluation) for these mechanics.

**Outcome:**
*   `engine-core` contains the necessary configurable components, hooks, and logic strategies to support the targeted advanced mechanics.
*   `game-configs` includes updated interfaces/types for configuring these mechanics.
*   `game-server` correctly handles RNG, evaluation, and state for these mechanics.
*   The engine is demonstrably capable of powering games with mechanics beyond standard lines/reels.

**Key Steps & Tasks (Iterative per Mechanic - e.g., Tumbling/Scatter Pays):**

1.  **Define/Refine Config (`game-configs`):**
    *   `[Task]` Define or refine interfaces for the specific mechanic (e.g., `TumblingSettings`, `ScatterPaysSymbolConfig`).
    *   `[Task]` Ensure `GameSettings` includes flags (`reelMechanism: 'tumbling'`, `winEvaluationMechanism: 'scatterPays'`) and specific config objects.
    *   `[Task]` Define strategy interfaces if needed (e.g., `ISpinReactor`, `IWinEvaluator`).
2.  **Engine Core - Logic Extension (`engine-core`):**
    *   `[Task]` Implement new or alternative feature logic hooks/modules (`src/features/`) for the mechanic:
        *   **Spin Cycle:** Create `TumblingReactor` (implementing `ISpinReactor`?) handling symbol removal, drop-down logic, re-evaluation loop (`src/features/spin-cycle/tumbling.ts`). Modify the core spin cycle to use the configured reactor.
        *   **Win Evaluation:** Create `ScatterPaysEvaluator` (implementing `IWinEvaluator`?) (`src/features/win-evaluation/scatter-pays.ts`). Modify `useWinEvaluation` to select the evaluator based on config.
    *   `[Task]` Write unit tests for the new logic modules/strategies.
3.  **Engine Core - Component Extension (`engine-core`):**
    *   `[Task]` Implement any necessary new reusable components (e.g., `<TumblingSymbolAnimator>` if different from standard win anim, specific grid layout components if needed for cluster pays).
    *   `[Task]` Modify existing components (`ReelContainer`, `StandardReelStrip`) to handle configuration flags and potentially different rendering logic/props required by the new mechanic (e.g., triggering symbol removal animations).
    *   `[Task]` Write basic component tests (RTL).
4.  **Server Implementation (`game-server`):**
    *   `[Task]` **(Backend Task)** Implement server-side RNG and state management for the new mechanic (e.g., generating initial grid, handling tumble sequences if stateful, evaluating scatter pays).
    *   `[Task]` **(Backend Task)** Update API endpoints (`/spin` response) to include necessary data for the client (e.g., symbols to remove after win, new symbols dropping in, win amounts per tumble).
5.  **Client-Server Integration (`engine-core`):**
    *   `[Task]` Update `ApiService` and associated types if the API contract changed.
    *   `[Task]` Ensure client-side logic (spin cycle reactor, win evaluator) correctly consumes and reacts to the specific data received from the server for this mechanic.
    *   `[Task]` Implement client-side animations for the mechanic (symbol removal, symbol drop) triggered by state changes driven by server responses (using GSAP).
6.  **Integration Testing:**
    *   `[Task]` Create a temporary test configuration or adapt the MVP game config to use the new mechanic.
    *   `[Task]` Perform integration testing between the updated client and server to verify the end-to-end flow of the new mechanic.

*(Repeat similar steps for other targeted mechanics like Ways, Clusters, Megaways, ensuring concurrent client/server development)*

**Definition of Done:**
*   Configuration types and interfaces in `game-configs` support the new mechanic(s).
*   `engine-core` implements the necessary reusable logic modules, strategies, and component adaptations for the mechanic(s), selectable via config.
*   `game-server` implements the corresponding backend logic and API updates.
*   Client and server correctly communicate and handle the state/results for the new mechanic(s).
*   Client correctly presents the visuals and animations for the new mechanic(s).
*   Unit and integration tests for the new engine capabilities pass.
*   Engine is validated to support the targeted advanced mechanics.

**Tracking:**
*   Create tickets for each mechanic, breaking down client and server tasks.
*   Track dependencies between client/server workstreams.
*   Code reviews for both engine and server changes.
*   Phase gate review: Demonstrate the engine running with the new mechanic(s), driven by the updated server logic. Confirm successful extension before validating with full game MVPs in Phase 9.
