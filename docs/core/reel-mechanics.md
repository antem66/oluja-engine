# Oluja Engine: Reel Mechanics (`src/core/ReelManager.js` & `src/core/Reel.js`)

**Last Updated:** March 30, 2024

## 1. Overview

The visual representation and behavior of the spinning reels are managed by two primary components: `ReelManager` and `Reel`.

*   **`ReelManager`:** Responsible for creating, positioning, masking, and managing the collection of all `Reel` instances.
*   **`Reel`:** Represents a single vertical reel column, managing its symbol strip, current position, visual effects (blur, shimmer), state transitions (spinning, stopping), and symbol display.

## 2. `ReelManager.js`

*   **Initialization (`constructor(parentLayer, appTicker, loggerInstance)`):**
    *   Receives the parent Pixi `Container` (usually `Game.layerReels`), the Pixi `Ticker`, and the `Logger`.
    *   Creates a main `reelContainer` which will hold all individual `Reel` instances. This container is positioned based on `reelAreaX` and `reelAreaY` settings.
    *   Calls `_createReels()` to instantiate the individual `Reel` objects.
    *   Calls `_applyMask()` to create and apply a `PIXI.Graphics` mask to the `reelContainer`, ensuring only the visible portion of the reels (defined by `SETTINGS.REEL_VISIBLE_HEIGHT`) is rendered.

*   **Reel Creation (`_createReels()`):**
    *   Loops from `0` to `NUM_REELS - 1`.
    *   For each index `i`, it retrieves the corresponding symbol strip from `REEL_STRIPS[i]`.
    *   Creates a new `Reel` instance, passing the `reelIndex`, the `strip`, and the `appTicker`.
    *   Adds the `Reel` instance's container (`reel.container`) as a child to the `ReelManager`'s main `reelContainer`.
    *   Stores the `Reel` instance in the `this.reels` array.

*   **Masking (`_applyMask()`):**
    *   Creates a `PIXI.Graphics` object shaped as a rectangle matching the dimensions of the visible reel area (`NUM_REELS * REEL_WIDTH` by `REEL_VISIBLE_HEIGHT`).
    *   **Important:** The mask graphic itself is positioned at the world coordinates of the reel area (`reelAreaX`, `reelAreaY`) and added to the `ReelManager`'s `parentLayer` (`Game.layerReels`).
    *   The `reelContainer`'s `mask` property is then set to this graphics object.

*   **Update (`update(delta, now)`):**
    *   Called by the main `Game.update` loop each frame.
    *   Iterates through the `this.reels` array.
    *   Calls the `update()` method on each individual `Reel` instance.
    *   Returns `true` if *any* of the managed reels are currently in a state other than `'stopped'` or `'idle'`, indicating that the overall spinning sequence is still visually in progress.

*   **Destruction (`destroy()`):**
    *   Calls `destroy()` on each individual `Reel` instance.
    *   Destroys the main `reelContainer` and its children (including the mask implicitly).
    *   Nullifies references.

## 3. `Reel.js`

*   **Initialization (`constructor(reelIndex, strip, appTicker)`):**
    *   Stores the `reelIndex`, symbol `strip`, and `appTicker`.
    *   Creates its own `container` (`PIXI.Container`) positioned horizontally based on its `reelIndex`.
    *   Initializes its logical `position` on the strip (often randomized initially).
    *   Calls `setupSpinEffects()` to create filters (Blur, ColorMatrix) and shimmer graphics.
    *   Calls `_createSymbols()` to create the initial set of `SymbolSprite` instances needed to fill the visible area plus buffers.
    *   Calls `alignReelSymbols()` to position the initial symbols correctly based on the starting `position`.

*   **Symbol Creation (`_createSymbols()`):**
    *   Determines the number of symbols needed (visible height + buffer top/bottom, typically `SYMBOLS_PER_REEL_VISIBLE + 2`).
    *   Creates instances of `SymbolSprite` (using `createSymbolGraphic` from `Symbol.js`), initially using a placeholder texture (e.g., `strip[0]`).
    *   Adds these sprites to the `this.symbols` array and the `reel.container`.

*   **Symbol Alignment (`alignReelSymbols()`):**
    *   This is called frequently (during spins and on stop) to ensure the correct symbols are displayed at the correct vertical positions.
    *   Calculates the `topVisibleStripIndex` based on the current fractional `this.position`.
    *   Iterates through the `SymbolSprite` instances in `this.symbols`.
    *   For each sprite, calculates its target vertical position (`symbolSprite.y`) based on its index relative to the top visible symbol and the fractional part of `this.position`.
    *   Determines the `expectedSymbolId` that *should* be displayed at that position based on the `targetStripIndex` into the `this.strip` array.
    *   **Optimization:** Compares the `symbolSprite.symbolId` with the `expectedSymbolId`. If they differ, it retrieves the new texture using `PIXI.Assets.get(expectedSymbolId)` and updates the `symbolSprite.texture` and `symbolSprite.symbolId` properties. **It reuses the existing sprite instead of destroying and recreating it.**

*   **State Machine & Update (`update(delta, now)`):**
    *   Implements a state machine (`this.state`: idle, accelerating, spinning, tweeningStop, stopped).
    *   **Accelerating/Spinning:** Increases `spinSpeed` (up to `maxSpinSpeed`), updates `position` based on speed and delta time, updates visual effects (`updateSpinEffects`), and calls `alignReelSymbols`.
    *   **Stopping:**
        *   Checks if `now >= this.targetStopTime - stopTweenDuration`. The `targetStopTime` is set externally (by `SpinManager` based on `ApiService` results) via `scheduleStop()`. `finalStopPosition` is also set externally.
        *   If the stop condition is met and no `stopTween` is active, it changes state to `tweeningStop`.
        *   It creates a **GSAP tween** (`gsap.to`) targeting the `this.position` property.
        *   The tween animates `this.position` from its current value to `this.finalStopPosition` over `stopTweenDuration` using easing (e.g., `power2.out`).
        *   The tween's `onUpdate` callback calls `alignReelSymbols` and fades out spin effects.
        *   The tween's `onComplete` callback sets the state to `'stopped'`, ensures the final position is exact, disables spin effects, and logs completion.
    *   Calls `alignReelSymbols` if the position changed significantly.

*   **Spin Effects (`setupSpinEffects`, `updateSpinEffects`, `setupShimmerEffect`, `updateShimmerEffect`):**
    *   Manages the `BlurFilter` and `ColorMatrixFilter` applied during spins.
    *   Creates and animates simple `PIXI.Graphics` streaks for a shimmer effect.
    *   Effects are enabled/disabled and their intensity is modulated based on the normalized `spinSpeed`.

*   **External Control:**
    *   `startSpinning()`: Initiates the spin sequence, sets state to `accelerating`, enables effects.
    *   `scheduleStop(targetStopTime)`: Stores the absolute time when the stop tween should *begin*.
    *   `finalStopPosition` (property): Set externally by `ResultHandler` before the stop tween starts, defining the exact strip index to land on.

*   **Destruction (`destroy()`):**
    *   Kills any active GSAP stop tween.
    *   Destroys the reel's `container` and all its children (including symbol sprites).
    *   Nullifies references.
