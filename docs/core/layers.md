# Oluja Engine: Layering System (`src/core/Game.js`)

**Last Updated:** [Current Date - Please update manually]

## 1. Overview

The Oluja Engine utilizes a structured layering system based on `PIXI.Container` instances within the main `Game` class (`src/core/Game.js`). This system is crucial for:

*   **Controlling Rendering Order:** Ensuring game elements like the background, reels, UI, and effects appear correctly stacked on top of each other.
*   **Organization:** Grouping related visual elements logically.
*   **Performance:** PixiJS optimizes rendering based on the container hierarchy.
*   **Maintainability & Extensibility:** Providing a clear and predictable structure for adding new visual features.

Layers are created during the `_createLayers` method of the `Game` class.

## 2. Main Layers

These are the primary containers added directly to the PixiJS stage (`app.stage`). Their stacking order is controlled by the `zIndex` property, with higher values appearing on top. They are created using the `_createLayer(name, zIndex)` helper function for consistency.

*   **`layerBackground` (`zIndex: 0`)**
    *   Purpose: Holds the main game background image or graphics.
    *   Managed by: `BackgroundManager.js`
*   **`layerReels` (`zIndex: 10`)**
    *   Purpose: Contains the `ReelManager`\'s main container, which holds all individual `Reel` instances and their symbols.
    *   Managed by: `ReelManager.js`
*   **`layerWinLines` (`zIndex: 20`)**
    *   Purpose: Holds the graphics objects used to draw winning paylines across the reels.
    *   Managed by: `PaylineGraphics.js`
*   **`layerUI` (`zIndex: 30`)**
    *   Purpose: Contains the main user interface elements like the bottom panel, balance/bet/win displays, and primary control buttons (Spin, Bet, Turbo, Autoplay).
    *   Managed by: `UIManager.js`
*   **`layerLogo` (`zIndex: 40`)**
    *   Purpose: Holds the game logo, typically positioned above the main UI but below transient effects.
    *   Managed by: `LogoManager.js`
*   **`layerFullScreenEffects` (`zIndex: 45`)**
    *   Purpose: A dedicated layer for transient, full-screen animations or effects that need to appear above the main game area (reels, UI, logo) but below general overlays. Example: The "FREE SPINS" entry animation.
    *   Content added by: Feature modules like `FreeSpins.js` (passed during initialization).
*   **`layerOverlays` (`zIndex: 50`)**
    *   Purpose: Acts as the primary parent container for various semi-persistent UI elements and messages that overlay the game. See **Section 4** for details on its sub-containers.
*   **`layerParticles` (`zIndex: 60`)**
    *   Purpose: Holds particle effects, typically used for win celebrations or other visual enhancements, ensuring they render above most other elements.
    *   Managed by: `Animations.js` (particle emitters are added here).
*   **`layerDebug` (`zIndex: 100`)**
    *   Purpose: Contains the debug panel UI. It has the highest `zIndex` to ensure it appears above everything else when activated. Its visibility is toggled.
    *   Managed by: `DebugPanel.js`

## 3. Layer Creation Helper: `_createLayer()`

To ensure consistency and reduce code repetition when creating the main layers, the `Game` class uses a private helper method:

```javascript
_createLayer(name, zIndex) {
    const layer = new PIXI.Container();
    layer.name = name; // Useful for debugging (e.g., PixiJS DevTools)
    layer.zIndex = zIndex; // Critical for sorting on the main stage
    return layer;
}
```

This function is called within `_createLayers` for each main layer listed above.

## 4. Overlay System (`layerOverlays`)

The `layerOverlays` container (`zIndex: 50`) serves as a parent for different categories of overlay information. Instead of adding various notification types directly to `layerOverlays`, we use **dedicated sub-containers**. This prevents different overlay features from interfering with each other (e.g., one feature accidentally clearing another's display).

These sub-containers are created as standard `PIXI.Container` instances (without a `zIndex`) and added as children to `layerOverlays`. Their stacking order *relative to each other* is determined by the order they are added using `layerOverlays.addChild()`.

*   **`fsIndicatorContainer`**
    *   Purpose: Holds the persistent Free Spins indicator UI (remaining spins, total win).
    *   Managed by: `FreeSpinsUIManager.js` (receives this container during init).
*   **`notificationsContainer`**
    *   Purpose: Holds general notifications and messages displayed to the user (e.g., "10 FREE SPINS AWARDED!", error messages).
    *   Managed by: `Notifications.js` (receives this container during init).
*   **`winAnnouncementsContainer`**
    *   Purpose: Holds large win announcements (e.g., "BIG WIN", win amount displays during win animations).
    *   Managed by: `Animations.js` (receives this container during init).

This sub-container approach ensures that modules like `Animations.js` can safely clear *their own* container (`winAnnouncementsContainer.removeChildren()`) without affecting the visibility of the Free Spins indicator or other notifications.

## 5. Extensibility

This layered structure is designed for future expansion:

*   **Adding New Main Layers:** If a completely new category of visual element is needed at a specific depth (e.g., a foreground weather effect layer), simply add a call to `this._createLayer(...)` in `_createLayers` with an appropriate name and `zIndex`, and add it to the `app.stage.addChild` call.
*   **Adding New Overlay Types:** If a new type of persistent overlay is required (e.g., a jackpot display), create a new `PIXI.Container` in `_createLayers`, give it a name, add it to `layerOverlays` using `addChild` in the desired stacking order, and pass it to its dedicated new manager module during initialization.
*   **Adding Full-Screen Effects:** New features requiring transient full-screen effects (like the FS entry animation) can receive the `layerFullScreenEffects` container during their initialization and add their temporary graphics to it, ensuring correct layering without needing to know about specific `zIndex` values.

By adhering to this structure, new features can be integrated cleanly with predictable rendering behavior.
