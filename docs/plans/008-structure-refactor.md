# Feature Plan: 001 - Engine Structure Refactoring

**Goal:** Refactor the project structure and module responsibilities to improve clarity, modularity, maintainability, and readiness for server integration and future feature development.

**Context:** Based on a code review following initial feature implementation and refactoring, several areas were identified where the structure could be improved. This includes clarifying the roles of `features/` vs `plugins/`, consolidating server-response handling, making plugins more self-contained, and ensuring a single source of truth for initial state.

**Requirements:**

1.  **Eliminate `src/features/` directory:** Distribute its current contents to more appropriate locations.
2.  **Create `src/core/presentation/`:** Move presentation-focused logic (`Animations.js`, `PaylineGraphics.js`) here.
3.  **Relocate Utilities:** Move animation utilities (`SpriteSheetAnimations.js`) to `src/utils/animation/` (creating subdirectory if needed). Address or remove `AnimationDemo.js`.
4.  **Refactor/Merge `WinEvaluation.js`:**
    *   Move server result validation and presentation preparation logic into `src/core/ResultHandler.js`.
    *   Move scatter check/trigger logic into the relevant plugin(s) (e.g., `FreeSpinsPlugin.js` or a new generic `ScatterPlugin.js`).
    *   Delete `src/features/WinEvaluation.js`.
5.  **Relocate Feature-Specific UI:** Move UI managers specific to plugins (e.g., `FreeSpinsUIManager.js`) into their respective plugin directories.
6.  **Reorganize `src/plugins/`:** Create subdirectories for each plugin (e.g., `plugins/autoplay/`, `plugins/freespins/`, `plugins/turbo/`) and move the corresponding plugin files into them.
7.  **Ensure Consistency:** Update all imports across the codebase to reflect the new file locations.
8.  **(Stretch Goal/Optional):** Explore splitting `Game.init()` into smaller helper functions or modules if complexity warrants it.

**Implementation Phases:**

*   [ ] **Phase 1: Directory & File Reorganization**
    *   [ ] Create `src/core/presentation/`.
    *   [ ] Create `src/utils/animation/`.
    *   [ ] Create subdirectories within `src/plugins/` (`autoplay`, `freespins`, `turbo`).
    *   [ ] Move `Animations.js` and `PaylineGraphics.js` to `src/core/presentation/`.
    *   [ ] Move `SpriteSheetAnimations.js` to `src/utils/animation/`.
    *   [ ] Move `FreeSpinsUIManager.js` to `src/plugins/freespins/`.
    *   [ ] Move `AutoplayPlugin.js`, `FreeSpinsPlugin.js`, `TurboPlugin.js` to their respective subdirectories.
    *   [ ] Delete `src/features/` directory (after WinEvaluation logic is moved).
    *   [ ] Update all affected import statements across the project.
*   [ ] **Phase 2: Logic Migration (WinEvaluation)**
    *   [ ] Identify scatter check/trigger logic in `WinEvaluation.js`.
    *   [ ] Move scatter logic to `FreeSpinsPlugin.js` (modifying it to react to result data potentially passed via event from `ResultHandler`).
    *   [ ] Define placeholder logic in `ResultHandler.js` for validating server results and preparing presentation data.
    *   [ ] Delete `src/features/WinEvaluation.js`.
    *   [ ] Update event listeners in plugins/presentation modules if trigger events change (e.g., listening to `ResultHandler` instead of `WinEvaluation`).
*   [ ] **Phase 3: Testing & Verification**
    *   [ ] Thoroughly test core game loop, spin cycle, and all existing features (Autoplay, Turbo, Free Spins) to ensure functionality is preserved after refactoring.
    *   [ ] Address any errors or regressions introduced.

**Current Progress:**

*   Plan created.

**Development Notes/Blockers:**

*   Need to decide precise mechanism for plugins (like FreeSpins) to get trigger data (e.g., scatter count) after `ResultHandler` processes server response. Likely via a specific event.
*   Extensive import path updates will be required.
*   Testing will be crucial to catch regressions.
