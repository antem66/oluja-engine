# Roadmap: Phase 6 - First Game MVP

**Reference Docs:**
*   `docs/v2/04-game-creation-workflow.md` (Game Creation Steps)
*   `docs/v2/06-animation-guide.md` (Game-Specific Animations)
*   `docs/v2/07-sound-system.md` (Sound Integration)

**Goal:** Fully configure and implement the first target game (`heavens-ten-deluxe-react`) to a Minimum Viable Product (MVP) state, using the engine capabilities built up to Phase 5 (including basic server integration). Focus on refining UI, integrating sound, polishing standard animations based on server results, and implementing MVP-level game-specific presentation.

**Prerequisites:** Phase 5 (Basic Server Integration) Completed. Engine supports standard line game loop driven by server results.

**Outcome:** A complete, playable MVP of `heavens-ten-deluxe-react` demonstrating the core engine functionality with server-authoritative results. The game is visually polished (for MVP level), includes core sounds, and functions correctly according to its specific configuration.

**Key Steps & Tasks:**

1.  **Complete Game Configuration (`games/heavens-ten-deluxe-react`):**
    *   `[Task]` Ensure all configuration files in `src/config/` are complete and accurate for the `heavens-ten-deluxe` game design, implementing all required interfaces from `game-configs` (Paytable, Paylines, ReelStrips, final AssetManifest, SoundConfig, AnimationTimings, Settings).
    *   `[Task]` (If using schemas) Validate the final configuration object against Zod schemas.
2.  **Implement Full Asset Loading (`engine-core` / `games/*`):**
    *   `[Task]` Ensure `useAssets` hook correctly loads all asset types defined in the manifest (textures, sounds, fonts).
    *   `[Task]` Implement a basic loading screen/indicator (either generic in `engine-core` or game-specific using `introScreenComponent` prop) driven by `useAssets` loading state.
3.  **Refine Core UI (`engine-core` / `games/*`):**
    *   `[Task]` Polish the appearance and layout of core UI elements (`Button`, `TextDisplay`, `Panel` etc.) using textures/styles defined in the game's config/assets.
    *   `[Task]` Implement bet selection UI and connect it to update the `bet` state in Zustand.
    *   `[Task]` Ensure all necessary UI displays (Balance, Bet, Win) are present and correctly formatted.
    *   `[Task]` Implement mobile layout adjustments using `ScaledContainer` or other responsiveness techniques.
4.  **Integrate Sound (`engine-core` / `games/*`):**
    *   `[Task]` Implement the `SoundManager` service and `useSound` hook in `engine-core` (as per `docs/v2/07...`).
    *   `[Task]` Ensure sounds defined in `SoundConfig` are loaded via `useAssets`.
    *   `[Task]` Trigger sounds via `useSound` hook at appropriate points: button clicks, reel stops, win presentations (different sounds for different win sizes?), background music loops.
5.  **Polish Animations (`engine-core` / `games/*`):**
    *   `[Task]` Refine standard reel spin/stop animations (using GSAP) based on final `AnimationTimings` config.
    *   `[Task]` Implement more polished win presentation sequence (lines, symbol highlights, win rollup) orchestrated possibly by a `useWinPresentation` hook using GSAP timelines.
    *   `[Task]` Implement any *simple* game-specific symbol animations required for the MVP using the `renderSymbol` prop pattern (if necessary) or within `BaseSymbol` if sufficient.
6.  **Game-Specific Presentation (If Any for MVP):**
    *   `[Task]` Implement the game-specific background component (`backgroundComponent` prop).
    *   `[Task]` Implement any other simple visual overrides needed for the MVP theme.
7.  **Testing & Validation:**
    *   `[Task]` Perform thorough manual testing of the complete game loop, UI interactions, sounds, and animations against the game design document.
    *   `[Task]` Verify correct communication with the (still minimal) `game-server` for spins and balance updates.
    *   `[Task]` Write specific integration tests for the game package, verifying configuration loading and basic rendering via RTL.

**Definition of Done:**
*   `heavens-ten-deluxe-react` configuration is complete and validated.
*   All required assets are loaded, with a functional loading indicator.
*   Core UI is implemented, themed, functional (including bet selection), and reasonably responsive.
*   Core sounds (spin, stop, win, music) are integrated and playing correctly.
*   Standard game loop animations are polished and driven by configuration and server results.
*   The game is playable end-to-end (spin -> server result -> presentation -> balance update) according to the standard game design.
*   MVP-level testing passes.

**Tracking:**
*   Create tickets for each `[Task]`, track progress.
*   Regular demos of the MVP game progress.
*   Code reviews for UI, sound, animation refinements, and game-specific implementations.
*   Phase gate review: Demonstrate the playable MVP game. Confirm engine stability and workflow before extending features in Phase 7.
