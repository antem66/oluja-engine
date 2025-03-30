# Oluja Engine: Animation System (`src/core/AnimationController.js` & Animation Implementations)

**Last Updated:** March 30, 2024

## 1. Overview

The Oluja Engine's animation system is managed primarily by the `AnimationController` (`src/core/AnimationController.js`). This class acts as a central hub for registering, managing, and triggering various visual animations within the game, such as symbol highlights, win rollups, big win presentations, and particle effects.

The core philosophy is **decoupling**:
*   **`AnimationController`:** Orchestrates *when* animations should play, based on game events or direct calls. It manages a registry of known animation types.
*   **Animation Implementation Modules (e.g., `src/core/animations/Animations.js` - though this specific file might be missing or named differently):** Contain the actual visual logic for specific animations using libraries like GSAP and PixiJS (e.g., tweening symbol scales, animating text, creating particle emitters). These modules *register* their animation functions with the `AnimationController`.

This separation allows different parts of the engine (UI, result handling, features) to easily trigger standardized animations without needing direct references to the implementation details.

## 2. `AnimationController.js`

*   **Initialization (`constructor`, `init`):**
    *   Receives dependencies like the `EventBus` and `Logger`.
    *   Creates a `Map` (`registeredAnimations`) to store animation callbacks.
    *   The `init()` method subscribes to the `win:validatedForAnimation` event, linking win results directly to the animation sequence.

*   **Registration (`registerAnimation(animationName, callback)`):**
    *   This is the **key method** for implementation modules to make their animations known to the controller.
    *   `animationName`: A string identifier (e.g., `'symbolWin'`, `'winRollup'`).
    *   `callback`: A function containing the animation logic. **Crucially, this function MUST return a Promise** that resolves when the animation it performs is complete.
    *   Multiple callbacks can be registered under the same `animationName`.
    *   Returns an `unregisterAnimation` function to allow cleanup.
    *   Example (from a hypothetical `Animations.js`):
        ```javascript
        // In Animations.js setup
        const unregister = animationController.registerAnimation('symbolWin', animateWinningSymbols); 
        // Later, maybe on destroy: unregister();

        function animateWinningSymbols(data) {
            // data likely contains { symbolIdentifiers: [...] }
            return new Promise(resolve => {
                // Use GSAP/PixiJS to animate symbols based on data.identifiers
                gsap.to(symbolSprites, { 
                    scale: 1.2, 
                    duration: 0.3, 
                    yoyo: true, 
                    repeat: 1,
                    onComplete: resolve // Resolve the promise when GSAP tween finishes
                });
            });
        }
        ```

*   **Execution (`playAnimation(animationName, data)`):**
    *   Called internally (usually by event handlers like `_handleWinValidated`) or externally to trigger animations.
    *   Looks up all registered `callback` functions for the given `animationName`.
    *   Executes each callback, passing the optional `data` payload.
    *   Collects all the Promises returned by the callbacks.
    *   Returns `Promise.all(promises)`, which resolves only after *all* registered animations for that `animationName` have completed. This allows sequencing of animation steps.

*   **Win Animation Handling (`_handleWinValidated(eventData)`):**
    *   This private method is triggered by the `win:validatedForAnimation` event.
    *   Receives detailed win information (`totalWin`, `winningLines`, `symbolIdentifiers`, `currentTotalBet`).
    *   Orchestrates the standard win presentation sequence by calling `playAnimation` for specific, conventional `animationName`s:
        1.  `playAnimation('symbolWin', { symbolIdentifiers })`: Animates the symbols involved in winning lines.
        2.  `playAnimation('winRollup', { totalWin, duration: WIN_ROLLUP_DURATION })`: Triggers the UI component responsible for visually counting up the win amount.
        3.  `playAnimation('bigWinText', { totalWin, totalBet })`: (Potentially conditional) Triggers animations for "Big Win", "Mega Win", etc., based on win thresholds relative to the bet.
        4.  `playAnimation('particleBurst', { totalWin, totalBet })`: (Potentially conditional) Triggers particle effects for significant wins.
    *   It likely uses `await Promise.all([...])` on these `playAnimation` calls to ensure the core win visuals complete.
    *   After the essential animations complete, it emits the `win:sequenceComplete` event via the `EventBus`, signaling that the main win presentation is finished and other modules (like Autoplay or Free Spins) can proceed.

*   **Destruction (`destroy`):**
    *   Unsubscribes from `EventBus` events.
    *   Clears the `registeredAnimations` map to release references.

## 3. Interaction with Implementation Modules

Modules responsible for specific visual effects (e.g., symbol animations, UI updates, particle effects) should:
1.  Import the `AnimationController` instance (usually passed via dependency injection).
2.  Define functions that perform the visual animation using PixiJS, GSAP, etc. These functions **must** return a `Promise` that resolves upon completion.
3.  During their initialization, call `animationController.registerAnimation('relevantName', theirAnimationFunction)`.
4.  Store and call the returned `unregister` function during their own destruction phase.

## 4. Common Animation Names (Convention)

While any name can be registered, the engine relies on conventional names triggered by `_handleWinValidated`:
*   `symbolWin`: Animating symbols on winning paylines.
*   `winRollup`: The numerical count-up of the win amount display.
*   `bigWinText`: Displaying textual/graphical overlays for large wins (Big, Mega, etc.).
*   `particleBurst`: Particle effects accompanying significant wins.
*   `paylineFlash`: (Likely registered by `PaylineGraphics`) Animating the paylines themselves.

Other names might be used for features like free spins transitions, symbol transformations, etc.

## 5. Win Sequence Summary

1.  `ResultHandler` validates a win and emits `win:validatedForAnimation`.
2.  `AnimationController._handleWinValidated` catches this event.
3.  Controller calls `playAnimation` for `symbolWin`, `winRollup`, `bigWinText`, `particleBurst` (potentially others).
4.  Registered callbacks (in `Animations.js`, `UIManager.js`, etc.) execute their GSAP/PixiJS logic and return Promises.
5.  `_handleWinValidated` awaits the completion of these core animation Promises.
6.  `AnimationController` emits `win:sequenceComplete` via the `EventBus`.
7.  Other modules (Autoplay, Free Spins) listening for `win:sequenceComplete` can now proceed.
