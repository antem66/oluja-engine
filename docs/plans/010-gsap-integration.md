# Feature Plan: 010 - GSAP Integration

**Goal:** Improve animation quality, smoothness, and control by refactoring existing non-GSAP animations to use the GSAP library.

**Context:** While GSAP is used for core reel stopping and some symbol animations, other parts of the codebase (like notifications, payline drawing) might still use `setTimeout`, `setInterval`, or direct property manipulation for animations. Replacing these with GSAP tweens and timelines provides better performance, easing options, and sequence management.

**Requirements:**

1.  Identify components currently using non-GSAP methods for animations (e.g., `Notifications.js`, `PaylineGraphics.js`).
2.  Refactor the identified animation logic to use `gsap.to()` or `gsap.timeline()`.
3.  Ensure animations achieve the same or better visual outcome (fades, flashes, movement).
4.  Utilize appropriate GSAP easing functions for smoother effects.
5.  Remove old `setTimeout`/`setInterval` logic related to these animations.
6.  Verify the refactored animations function correctly.

**Phases:**

*   **Phase 1: Refactor `Notifications.js`**
    *   [x] Task 1.1: Refactor `showOverlayMessage` fade-in/out using `gsap.timeline()`. (Already using GSAP)
    *   [x] Task 1.2: Refactor `flashElement` tint/alpha animation using `gsap.to()`. (DONE)
    *   [x] Task 1.3: Test notification message display and element flashing. (DONE - `flashElement` not currently used)
*   **Phase 2: Refactor `PaylineGraphics.js`**
    *   [x] Task 2.1: Refactor line drawing/fade-in animation in `_drawLines` or related methods using GSAP. (Already using GSAP)
    *   [x] Task 2.2: Refactor line fade-out logic (`_fadeLinesOut` or similar) using GSAP. (Already using GSAP)
    *   [x] Task 2.3: Test payline drawing, animation, and clearing. (DONE)
*   **Phase 3: Identify & Refactor Other Candidates (Optional)**
    *   [ ] Task 3.1: Review other modules (e.g., UI elements, feature transitions) for non-GSAP animations.
    *   [ ] Task 3.2: Refactor identified animations if applicable. (Example: Big Win text)

**Current Progress:**

*   Phase 1 & 2 complete (found modules already using GSAP or refactored `flashElement`).
*   Next Step: Consider Phase 3 (e.g., Refactor Big Win text animation) or move to a different feature.

**Notes/Decisions:**

*   `showOverlayMessage` and `PaylineGraphics` animations were already using GSAP.
*   `flashElement` refactored but is not currently used in the codebase.
