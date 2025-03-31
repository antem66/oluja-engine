# Roadmap: Phase 4 - Standard Game Loop & Animation

**Reference Docs:**
*   `docs/v2/02-engine-core-deep-dive.md` (Features/spin-cycle, win-evaluation, win-presentation, Components/reels, effects)
*   `docs/v2/03-configuration-system.md` (Paylines, AnimationTimings)
*   `docs/v2/06-animation-guide.md` (GSAP Integration)

**Goal:** Implement the core logic and animation for a standard line-based game loop: Spin initiation, reel animation, stopping at a result, line win evaluation, and basic win presentation (line drawing, symbol highlights).

**Prerequisites:** Phase 3 (State Management & Basic Interaction) Completed.

**Outcome:** A minimally playable game loop. Clicking Spin initiates animations, reels stop showing results (client-generated for now), winning lines are drawn, winning symbols are highlighted, and the UI reflects the win amount.

**Key Steps & Tasks:**

1.  **Spin Cycle Logic (`engine-core`):**
    *   `[Task]` Implement core spin cycle logic, likely within a `useSpinCycle` hook or managed by Zustand actions (`src/features/spin-cycle/`).
    *   `[Task]` Refine the `startSpin` action:
        *   Set `isSpinning = true`.
        *   Clear previous win state (`winningLinesInfo = null`, `lastTotalWin = 0`).
        *   **Generate Mock Results:** For now, create mock `targetStopSymbols` (representing the final grid result) using client-side logic (e.g., simple random selection from reel strips based on config). This will be replaced by server results in Phase 9.
        *   Set the `targetStopSymbols` in the Zustand store.
        *   (*Reel animation is triggered by components reacting to `isSpinning` state*).
    *   `[Task]` Implement logic/state to detect when all reel stop animations are complete (e.g., components dispatching an action, or the spin cycle hook polling reel states).
    *   `[Task]` When all reels are stopped, trigger the win evaluation process.
2.  **Reel Spin/Stop Animation (`engine-core`):**
    *   `[Task]` Enhance `StandardReelStrip` animation logic (`src/components/reels/standard/StandardReelStrip.tsx`):
        *   When `isSpinning` becomes true, start a looping GSAP animation for the spin visual (blur/displacement optional).
        *   When `targetStopSymbols` state is set (and `isSpinning` is true), calculate the final `y` position needed to show the target symbols.
        *   Initiate a GSAP `to` tween to animate the reel strip's `y` position to the calculated stop position.
        *   Use `AnimationTimings` config for duration, delay (stagger), and easing.
        *   **Crucial:** The tween's `onUpdate` needs to update which symbols are actually visible/rendered based on the current tween position.
        *   The tween's `onComplete` should precisely set the final `y` position and potentially signal completion (e.g., update a `reelStatus` state slice in Zustand: `spinning` -> `stopping` -> `stopped`).
    *   `[Task]` Add Turbo Mode consideration: Check `isTurboMode` state and use alternate timings from config if true.
3.  **Standard Line Win Evaluation (`engine-core`):**
    *   `[Task]` Implement the `line-evaluator.ts` logic (`src/features/win-evaluation/line-evaluator.ts`).
        *   Takes the final `reelSymbols` grid (from state), `PaylineSet` config, and `Paytable` config as input.
        *   Iterates through paylines, compares symbols against paytable, calculates wins.
        *   Returns `winningLinesInfo` (array of objects with line index, symbol positions, win amount) and `totalWin`.
    *   `[Task]` Implement the `useWinEvaluation` hook (`src/features/win-evaluation/index.ts`) which selects the correct evaluator (currently `line-evaluator`) based on config and calls it.
    *   `[Task]` Trigger `useWinEvaluation` when the spin cycle determines all reels have stopped.
    *   `[Task]` Update Zustand store (`winningLinesInfo`, `lastTotalWin`) with the results.
    *   `[Task]` Write unit tests for the line evaluator logic.
4.  **Basic Win Presentation (`engine-core`):**
    *   `[Task]` Implement `<WinningLinesOverlay>` (`src/components/effects/WinningLinesOverlay.tsx`):
        *   Subscribe to `winningLinesInfo` state.
        *   Use `<Graphics>` `draw` prop to draw lines connecting symbol centers based on winning line data. Use configurable line style.
    *   `[Task]` Implement symbol win highlighting in `<BaseSymbol>` (`src/components/reels/common/BaseSymbol.tsx`):
        *   Determine if the symbol instance is part of a win by checking its position against `winningLinesInfo` state.
        *   If winning, trigger a simple GSAP animation (e.g., scale pulse, tint) via `useEffect`.
        *   Use timings/eases from `AnimationTimings` config.
    *   `[Task]` Update the Win display UI (`<TextDisplay>` within `<UIOverlay>`) to show the `lastTotalWin` from the state store.
    *   `[Task]` Implement basic win presentation sequence logic (e.g., using `useEffect` in a component or a `useWinPresentation` hook triggered by `winningLinesInfo`): Show lines -> trigger symbol anims -> update win display text.
5.  **Integration & Verification:**
    *   `[Task]` Run the game package.
    *   `[Task]` Verify: Clicking Spin animates reels smoothly according to timings. Reels stop showing the mock result. If the mock result contains line wins, the corresponding lines are drawn, winning symbols pulse/highlight, and the win amount updates in the UI. Turbo Mode affects speeds.

**Definition of Done:**
*   Core spin cycle logic (client-side results) is implemented.
*   Standard reels animate spin and stop based on state and mock results, respecting timings and Turbo mode.
*   Standard line win evaluation logic calculates wins correctly based on mock results and config.
*   Basic win presentation (lines drawn, symbols highlighted, win meter updated) occurs after reels stop.
*   Relevant unit/component tests pass.

**Tracking:**
*   Create tickets for each `[Task]`, track progress.
*   Code reviews for spin cycle, animation, and win evaluation logic.
*   Phase gate review: Demonstrate the complete standard game loop with mock results. Ensure core mechanics are functional before building the full MVP game in Phase 5.
