# Roadmap: Phase 9 - Multi-Game Validation

**Reference Docs:**
*   `docs/v2/04-game-creation-workflow.md` (Game Creation Steps)
*   All other `docs/v2/*` documentation as reference for engine capabilities.

**Goal:** Validate the engine's extensibility, flexibility, and the documented game creation workflow by building MVPs for 1-2 additional, distinct slot games featuring different mechanics (e.g., Tumbling/Scatter Pays, Ways/Megaways) implemented in Phase 8.

**Prerequisites:**
*   Phase 8 (Advanced Mechanic Support) Completed. The engine and server support the target diverse mechanics.
*   Game design documents and assets are ready for the new MVP games.

**Outcome:**
*   Working MVPs of 1-2 additional games with different core mechanics are completed.
*   The documented game creation workflow is validated and refined based on practical experience.
*   High confidence is achieved in the engine's ability to efficiently support the development of diverse, high-quality games.
*   Any shortcomings or necessary improvements in the engine's extensibility points or documentation are identified.

**Key Steps & Tasks (Repeat for each new game MVP - e.g., Game B - Tumbling):**

1.  **Follow Game Creation Workflow (`docs/v2/04-game-creation-workflow.md`):**
    *   `[Task]` Create new game package `packages/games/game-b-tumbling/`.
    *   `[Task]` Initialize package (`package.json`, `tsconfig.json`, add to workspace).
    *   `[Task]` Create directory structure (`src/config`, `src/assets`, `src/components`, etc.).
    *   `[Task]` Add game-specific assets to `src/assets/`.
2.  **Define Game B Configuration (`games/game-b-tumbling/src/config/`):**
    *   `[Task]` Create config files (`settings.ts`, `symbols.ts`, etc.) implementing interfaces from `game-configs`.
    *   `[Task]` **Crucially, set `GameSettings` flags to enable the desired mechanics** (e.g., `reelMechanism: 'tumbling'`, `winEvaluationMechanism: 'scatterPays'`).
    *   `[Task]` Define assets, sounds, timings specific to Game B.
    *   `[Task]` Define any specific `FeatureParameters` needed.
    *   `[Task]` Export the final `gameConfiguration` object.
3.  **Implement Game B Specifics (`games/game-b-tumbling/src/`):**
    *   `[Task]` Create game-specific Intro screen, Background component.
    *   `[Task]` Implement custom Symbol component (`renderSymbol`) if needed for unique tumble/win animations.
    *   `[Task]` Implement any unique feature logic or UI components specific to Game B.
    *   `[Task]` Implement the main entry point (`main.tsx`), rendering `<GameContainer>` and passing Game B's config and custom components/renderers.
4.  **Backend Configuration (`game-server`):**
    *   `[Task]` **(Backend Task)** Ensure the `game-server` can load and use Game B's specific configuration (math, reels, payouts) for its RNG and evaluation logic when handling requests for this game ID.
5.  **Testing & Validation:**
    *   `[Task]` Run Game B locally (`pnpm --filter @heavens-ten/game-b-tumbling dev`).
    *   `[Task]` Perform thorough testing of Game B's MVP features, focusing on the correct functioning of the advanced mechanic (tumbling, scatter pays) as driven by the engine and server.
    *   `[Task]` Verify UI, animations, sounds match Game B's design.
    *   `[Task]` Add specific tests for Game B's unique components/logic.
6.  **Workflow & Engine Feedback:**
    *   `[Task]` Document any difficulties, ambiguities, or missing pieces encountered while following the game creation workflow.
    *   `[Task]` Identify any limitations or awkwardness in `engine-core`'s extensibility points when implementing Game B's specifics.
    *   `[Task]` Create tickets for necessary improvements to the engine or documentation based on this feedback.

**(Repeat Steps 1-6 for Game C - e.g., Megaways/Ways)**

**Definition of Done:**
*   MVPs for 1-2 additional distinct games (utilizing advanced mechanics) are implemented and playable.
*   The games function correctly according to their design, leveraging the appropriate engine mechanics selected via configuration and driven by the server.
*   The game creation workflow document is validated/updated.
*   Feedback on engine extensibility and documentation is collected.
*   Necessary improvement tickets for the engine/docs are created.

**Tracking:**
*   Create tickets for each game MVP implementation, broken down by workflow steps.
*   Track feedback and resulting improvement tickets separately.
*   Code reviews for new game packages.
*   Phase gate review: Demonstrate the new game MVPs. Discuss workflow feedback and engine improvement needs. Confirm readiness to move to final production hardening (Phase 10).
