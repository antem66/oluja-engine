# Feature Plan: 012 - Asset Preloading & Loading Screen

**Status:** Proposed

## 1. Goal

Implement a robust asset preloading mechanism and display a visually appealing loading screen during this process. The loading screen should show the overall loading progress (ideally with a progress bar) and feature your game studio logo.

## 2. Context

Currently, asset loading (`_loadAssets` in `Game.js`, `loadButtonAssets` in `ButtonFactory.js`) might happen without explicit user feedback on progress, potentially leading to a blank screen or perceived delay before the game appears. A dedicated loading phase improves the user experience by providing visual feedback and ensuring all necessary assets are ready before the game starts.

## 3. Requirements

1.  **Asset Manifest:** Define a comprehensive list (manifest) of all critical assets required for the game to start (e.g., background, symbol textures, UI elements, button icons, crucial audio). This manifest should be easily maintainable.
2.  **Loading Screen Scene:**
    *   Create a simple, dedicated loading screen displayed *before* the main game scene is initialized.
    *   This screen should ideally use minimal assets itself (perhaps only the studio logo, loaded first).
    *   Display your game studio logo prominently.
    *   Include a visual progress indicator (e.g., a horizontal progress bar).
    *   Optionally, display loading percentage text.
3.  **Preloading Logic:**
    *   Use `PIXI.Assets` for loading.
    *   Load the minimal loading screen assets first (studio logo).
    *   Once the loading screen is displayed, initiate the loading of all assets defined in the manifest.
    *   Monitor the loading progress provided by `PIXI.Assets`.
4.  **Progress Updates:** Update the progress bar (and optional percentage text) on the loading screen based on the asset loading progress.
5.  **Transition:** Once all assets are loaded:
    *   Animate the loading screen fading out or transitioning away smoothly.
    *   Initiate the main `Game` initialization sequence (`game.init()`).
6.  **Error Handling:** Implement basic error handling for asset loading failures (log errors, potentially display a message).

## 4. Implementation Phases & Tasks

**Phase 1: Loading Screen Setup & Initial Display**

*   [ ] **Task 1.1:** Prepare Studio Logo Asset:
    *   Ensure the studio logo image file exists (e.g., `public/assets/images/ui/studio_logo.png`).
*   [x] **Task 1.2:** Create Loading Screen Module:
    *   Create a new file, e.g., `src/core/LoadingScreen.js`.
    *   Define a class or functions within this module to create and manage the loading screen elements (using PixiJS).
    *   The module should expose functions like `show()`, `updateProgress(progress)`, and `hide()`. It will need access to the PixiJS `app` or `stage`.
*   [x] **Task 1.3:** Design Loading Screen Elements:
    *   Inside `LoadingScreen.js`, create PIXI objects for:
        *   A background (simple color fill or minimal graphic).
        *   The studio logo (`PIXI.Sprite`).
        *   A progress bar background (`PIXI.Graphics`).
        *   A progress bar fill (`PIXI.Graphics`).
        *   Optional: Loading percentage text (`PIXI.Text`).
    *   Position these elements appropriately.
*   [x] **Task 1.4:** Modify `main.js` (Entry Point):
    *   Create the `PIXI.Application` instance earlier in `main.js`.
    *   Load *only* the studio logo asset first using `PIXI.Assets.load()`.
    *   Instantiate `LoadingScreen` and call its `show()` method, passing the Pixi app/stage and the loaded logo texture.
    *   Ensure the loading screen is visible immediately.

**Phase 2: Asset Manifest & Preloading Logic**

*   [x] **Task 2.1:** Create Asset Manifest:
    *   Create a new configuration file, e.g., `src/config/assetManifest.js`.
    *   Define an array or object listing all critical assets with their aliases and paths (textures, SVGs, potentially audio/spritesheets).
    *   Example:
        ```javascript
        export const ASSET_MANIFEST = [
            // UI / Logo
            { alias: 'logo', src: 'assets/images/ui/logo.png' },
            // Background
            { alias: 'background1', src: 'assets/images/backgrounds/bg_default.jpg' },
            // Symbols (Example)
            { alias: 'SYM1', src: 'assets/images/symbols/sym1.png' },
            // ... all other symbols ...
            // Controls
            { alias: 'btn_spin', src: 'assets/control/spin.svg' },
            // ... all other controls ...
            // Audio (Example)
            // { alias: 'spinSound', src: 'assets/audio/spin.mp3' },
        ];
        ```
*   [x] **Task 2.2:** Implement Preloading in `main.js`:
    *   After showing the loading screen, initiate the loading of assets from `ASSET_MANIFEST` using `PIXI.Assets.load(manifest, progressCallback)`. 
    *   Define the `progressCallback` function.
*   [x] **Task 2.3:** Implement Progress Callback:
    *   The `progressCallback` function (passed to `PIXI.Assets.load`) will receive a value between 0 and 1.
    *   Inside this callback, call `LoadingScreen.updateProgress(progressValue)` to update the visual progress bar and text.

**Phase 3: Transition to Game**

*   [x] **Task 3.1:** Handle Load Completion in `main.js`:
    *   The `PIXI.Assets.load()` promise resolves when all assets are loaded.
    *   Move the original game initialization code (creating services like EventBus, ApiService, FeatureManager, initGameState, Game dependencies, `new Game()`, `game.init()`) *inside* the `try` block after `await PIXI.Assets.load(...)` succeeds.
    *   Before initializing the game, call `await loadingScreen.hide();` to fade out the loading screen.
*   [x] **Task 3.2:** Modify `Game.js` Initialization:
    *   Remove the asset loading steps (`_loadAssets`) from `Game.init()`, as assets are now preloaded.
    *   Ensure the Pixi Application instance created in `main.js` is passed correctly to the `Game` constructor or retrieved by it.

**Phase 4: Refinements & Error Handling**

*   [ ] **Task 4.1:** Loading Screen Animations:
    *   Implement smooth fade-in/out animations for the loading screen elements in `LoadingScreen.js` (using GSAP).
*   [ ] **Task 4.2:** Progress Bar Animation:
    *   Animate the progress bar fill smoothly in `LoadingScreen.updateProgress` instead of just setting its width instantly (e.g., `gsap.to(progressBarFill, { width: targetWidth, duration: 0.1 })`).
*   [ ] **Task 4.3:** Error Handling:
    *   Add `try...catch` around the `PIXI.Assets.load()` calls in `main.js`.
    *   Log errors using the logger.
    *   Consider displaying an error message on the loading screen if critical assets fail to load.
*   [ ] **Task 4.4:** Testing:
    *   Test with cleared cache to ensure loading screen appears and progresses.
    *   Test on slower network connections (using browser dev tools) to observe progress bar behavior.
    *   Verify smooth transition to the game scene.

## 5. Current Progress

*   Plan created. All phases outstanding.

## 6. Notes/Decisions

*   The `PIXI.Application` instance needs to be created early in `main.js` to be available for the `