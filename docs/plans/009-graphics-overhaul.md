# Feature Plan: 009 - Graphics Overhaul (Symbols)

**Goal:** Improve performance and visual fidelity by replacing the PIXI.Graphics-based symbol rendering with PIXI.Sprite-based rendering using loaded textures.

**Context:** The current `Symbol.js` class draws symbols using `PIXI.Graphics`. This is inefficient for numerous, frequently updated elements like slot symbols. `Game.js` already loads textures for each symbol ID from `assets/images/`. We need to leverage these textures for rendering.

**Requirements:**

1.  Modify `Symbol.js` to extend or primarily use `PIXI.Sprite`.
2.  The `Symbol` class constructor should accept a `symbolId` and use it to retrieve the corresponding loaded `PIXI.Texture` from the `PIXI.Assets` cache.
3.  The `Symbol` class should set its `texture` property to the retrieved texture.
4.  Remove the `PIXI.Graphics` drawing logic from `Symbol.js`.
5.  Update `Reel.js` where `Symbol` instances are created (`_createSymbols`) to correctly instantiate the new Sprite-based Symbols.
6.  Update `Reel.js` where symbol textures/visibility might be manipulated (`alignReelSymbols`) to work with Sprites (e.g., setting `.texture` or `.visible` properties).
7.  Ensure symbol dimensions and positioning within the reel remain correct after the change.
8.  Verify that symbols still appear correctly during idle state and spins.
9.  Verify that winning symbol animations (which now operate on Sprites) still function correctly.

**Phases:**

*   **Phase 1: Refactor `Symbol.js`**
    *   [x] Task 1.1: Modify `Symbol.js` to use `PIXI.Sprite`. (Already done)
    *   [x] Task 1.2: Update constructor to accept `symbolId` and load texture from `PIXI.Assets`. (Already done)
    *   [x] Task 1.3: Remove old `PIXI.Graphics` drawing code. (Already done)
*   **Phase 2: Update `Reel.js`**
    *   [x] Task 2.1: Modify `_createSymbols` to instantiate Sprite-based Symbols. (Already done)
    *   [x] Task 2.2: Modify `alignReelSymbols` to update Sprite textures/visibility. (DONE)
*   **Phase 3: Testing & Verification**
    *   [x] Task 3.1: Test idle symbol display. (DONE)
    *   [x] Task 3.2: Test symbol appearance during spins. (DONE)
    *   [x] Task 3.3: Test symbol appearance on final stop positions. (DONE)
    *   [x] Task 3.4: Test winning symbol animations. (DONE)

**Current Progress:**

*   Feature implementation complete.

**Notes/Decisions:**

*   `Symbol.js` already extended `PIXI.Sprite`.
*   `Reel.js` updated to reuse sprites and update textures.
*   Consider symbol anchor points if needed for positioning/scaling/rotation effects later.
