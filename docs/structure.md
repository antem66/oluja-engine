Okay, here is a summary for each file, outlining its purpose, importance, and connections to other files, designed to help you navigate the project.

---

**`./src//ui/InfoOverlay.js`**

*   **Purpose:** Manages a simple HTML overlay (outside the PixiJS canvas) to display game status information like Autoplay spins remaining or Free Spins count and winnings.
*   **Importance:** Provides non-intrusive, persistent status information to the player, especially during automatic modes (Autoplay, Free Spins). Uses standard DOM elements, separate from the main game canvas rendering.
*   **Links:**
    *   **Imports:** `GameState` (reads `isAutoplaying`, `autoplaySpinsRemaining`, `isInFreeSpins`, `freeSpinsRemaining`, `totalFreeSpinsWin`).
    *   **Exports:** `initInfoOverlay` (called once by `Game.js` during setup, passing the DOM element), `updateInfoOverlay` (called periodically, likely by `Game.js` or potentially triggered by state changes, to refresh the display).
    *   **DOM:** Directly interacts with an HTML element (identified by `infoOverlayElement`) likely defined in `index.html` and styled by `main.css`.

---

**`./src//ui/ButtonHandlers.js`**

*   **Purpose:** Contains the *logic* that executes when the main UI control buttons (Spin, Bet+, Bet-, Autoplay, Turbo) are pressed. It translates user clicks into game actions.
*   **Importance:** This is the core of player interaction. Without these handlers, the buttons would be visual elements with no functionality. It bridges the UI event (click) with changes in the game's state and triggers core game processes.
*   **Links:**
    *   **Imports:**
        *   `config/gameSettings.js`, `config/paylines.js`: Reads configuration values (bet levels, payline count).
        *   `core/GameState.js` (`state`, `updateState`): Reads current game state (e.g., `isSpinning`, `balance`) and *writes* updates (e.g., changes `currentBetPerLine`, toggles `isAutoplaying`, `isTurboMode`).
        *   `ui/UIManager.js`: Calls functions to update UI displays (`updateDisplays`), button appearances (`updateAutoplayButtonState`, `updateTurboButtonState`), and enable/disable states (`setButtonsEnabled`).
        *   `features/TurboMode.js` (`applyTurboSettings`): Triggers the application of turbo mode animation settings.
        *   `core/Game.js` (`startSpinLoop`): Initiates the main reel spinning process in the `Game` module.
        *   `ui/Notifications.js` (Potentially, via `flashElement`): Could trigger visual feedback (currently commented out).
    *   **Exports:** Exports handler functions (`decreaseBet`, `increaseBet`, `toggleAutoplay`, `toggleTurbo`, `startSpin`). These functions are used as callbacks, passed to `ButtonFactory.js` when creating the buttons (likely wired up in `Game.js`).

---

**`./src//ui/UIManager.js`**

*   **Purpose:** Manages the creation, updating, and state visualization of the main PixiJS UI elements within the game canvas. This includes text displays (Balance, Bet, Win, Win Rollup) and handling the visual states (enabled/disabled, active/inactive appearance) of buttons.
*   **Importance:** Responsible for presenting crucial game information (balance, bet, wins) to the player within the PixiJS environment and ensuring controls visually reflect the game's state (e.g., graying out buttons when disabled).
*   **Links:**
    *   **Imports:**
        *   `pixi.js`, `gsap`: For UI element creation and potential animations (like win rollup).
        *   `core/GameState.js` (`state`): Reads game state to update text displays and button appearances.
        *   `config/gameSettings.js`: Reads layout constants (width, UI position).
    *   **Exports:**
        *   `initUIManager`: Called by `Game.js` to create the initial text elements and find button references within the `uiContainer`.
        *   `updateDisplays`: Called by `Game.js`, `ButtonHandlers.js`, `WinEvaluation.js`, etc., whenever the balance, bet, or win amount changes.
        *   `setButtonsEnabled`: Called by `Game.js`, `ButtonHandlers.js`, `FreeSpins.js`, `Autoplay.js` to enable/disable user interaction with controls based on game state.
        *   `updateAutoplayButtonState`, `updateTurboButtonState`: Called by `ButtonHandlers.js` (and potentially `Game.js` or feature modules) to update the visual appearance (icon, active state) of toggle buttons.
        *   `getWinRollupText`: Used by `Animations.js` to get a reference to the text element used for the win rollup effect.
    *   **Other:** Holds references (`spinButton`, `autoplayButton`, etc.) to button instances created by `ButtonFactory.js` (likely created in `Game.js` and added to the `uiContainer`).

---

**`./src//ui/DebugPanel.js`**

*   **Purpose:** Creates and manages a separate, toggleable PixiJS overlay panel containing debug controls. Allows developers to manipulate game state (e.g., add balance, force wins) and adjust visual elements (like background position/scale) during development.
*   **Importance:** Facilitates testing and debugging by providing direct manipulation of game parameters and visualization settings without modifying the core game logic constantly.
*   **Links:**
    *   **Imports:**
        *   `pixi.js`: For creating the panel graphics, text, and controls.
        *   `core/GameState.js` (`state`, `updateState`): Reads debug-related state (`isDebugMode`, `forceWin`) and writes changes to state (toggling flags, adding balance).
    *   **Exports:**
        *   `initDebugPanel`: Called by `Game.js` during setup to create the panel and add it to the PIXI stage.
        *   `updateDebugControls`: Potentially called if debug controls need to be refreshed based on external state changes (though `toggleDebugPanel` also handles updates).
    *   **Other:**
        *   Adds elements directly to the main PIXI `app.stage`.
        *   Interacts with the `Game` instance via `window.gameApp.adjustBackground` (a dynamic property added in `Game.js`) to modify the background sprite.

---

**`./src//ui/ButtonFactory.js`**

*   **Purpose:** Provides a factory function (`createButton`) to generate reusable, interactive PixiJS button components. Handles button appearance (shape, color, icons/text), different visual states (idle, hover, down, active), basic click animations (scaling, spin effect), and loading button icon assets.
*   **Importance:** Encapsulates button creation logic, promoting consistency and reusability across the UI. Separates the button's visual representation and basic interaction logic from the specific game action triggered on click (which is handled by the provided callback).
*   **Links:**
    *   **Imports:**
        *   `pixi.js`, `gsap`: For creating graphics/sprites, handling events, and animating button interactions.
    *   **Exports:**
        *   `createButton`: The main factory function, called by `Game.js` during UI setup to create all the control buttons. It takes a `callback` function (which comes from `ButtonHandlers.js`) that is executed on click.
        *   `loadButtonAssets`: Called by `Game.js` during initialization to preload SVG icon assets.
    *   **Other:** The created `Button` instances contain the logic for visual state changes and invoke the `callback` function passed into `createButton`.

---

**`./src//ui/Notifications.js`**

*   **Purpose:** Handles the display of temporary overlay messages (e.g., "Free Spins Awarded", "Big Win!") and visual flashing effects on specific UI elements. Manages the creation, animation (fade-in/out), and removal of these notifications.
*   **Importance:** Provides important feedback to the player about significant game events (feature triggers, large wins) in a visually prominent way.
*   **Links:**
    *   **Imports:**
        *   `pixi.js`, `gsap`: For creating text elements and animating their appearance/disappearance.
        *   `config/animationSettings.js`, `config/gameSettings.js`: Reads animation timing multipliers and game dimensions.
    *   **Exports:**
        *   `initNotifications`: Called by `Game.js` during setup, passing the `overlayContainer` for displaying messages.
        *   `flashElement`: Called potentially by `UIManager.js` or `ButtonHandlers.js` to apply a flashing effect to elements like the balance display (though currently might be handled differently).
        *   `showOverlayMessage`: Called by `FreeSpins.js` (enter/exit messages) and potentially `WinEvaluation.js` or `Animations.js` for win announcements.
    *   **Other:** Adds temporary elements (like `PIXI.Text`) to the `overlayContainer` provided during initialization.

---

**`./src//Game.js` (tiny file)**

*   **Purpose:** This specific, small `Game.js` file seems dedicated *only* to initializing the custom animations defined in `AnimationDemo.js`.
*   **Importance:** Ensures that the demo animations are registered and ready to be used by the main animation system. It seems separate from the main game logic file (`./src//core/Game.js`). *This might be a leftover or a specific setup for the animation demo feature.*
*   **Links:**
    *   **Imports:** `features/AnimationDemo.js` (`setupCustomAnimations`).
    *   **Exports:** None.
    *   **Other:** Calls `setupCustomAnimations`. Its execution context depends on how it's imported or run, likely intended to be run after the main game setup.

---

**`./src//core/Reel.js`**

*   **Purpose:** Represents and manages a single vertical reel in the slot machine. Handles its symbol strip data, current position, spinning physics (acceleration, speed, deceleration), stopping logic (tweening to a target position), symbol alignment, and visual effects during spin (blur, shimmer).
*   **Importance:** This is the fundamental component for the core slot mechanic. The collective behavior of multiple `Reel` instances creates the spinning slot machine effect.
*   **Links:**
    *   **Imports:**
        *   `pixi.js`, `gsap`: For creating the container, symbol graphics, and handling animations (spin effects, stop tween).
        *   `config/gameSettings.js`, `config/animationSettings.js`: Reads constants like symbol size, reel width, visible symbols, spin speeds, and timing.
        *   `core/Symbol.js` (`createSymbolGraphic`): Creates the visual representation for each symbol displayed on the reel.
    *   **Exports:** The `Reel` class. Instances of this class are created and managed by `Game.js`.
    *   **Other:** Contains an array (`symbols`) of `SymbolSprite` instances. Its `update` method is called continuously by the main game loop (`Game.js`) to drive its motion and state transitions.

---

**`./src//core/Game.js` (main core file)**

*   **Purpose:** Acts as the central orchestrator and entry point for the game logic running within the PixiJS canvas. Initializes the PixiJS application, loads assets, sets up containers, creates and manages core components (Reels, UI), initializes all feature modules (Free Spins, Turbo, Autoplay, Win Evaluation, Animations, Debug), handles the main game loop (`update`), and manages the overall spin cycle flow (start, check for stop, evaluate win).
*   **Importance:** This is the "heart" of the game application. It ties all the different modules and features together, manages the primary game flow, and drives updates via the game loop.
*   **Links:**
    *   **Imports:** Imports nearly every other module in the project (`PIXI`, settings, `GameState`, `Reel`, `ButtonFactory`, `ButtonHandlers`, `InfoOverlay`, `Notifications`, `WinEvaluation`, `PaylineGraphics`, `FreeSpins`, `TurboMode`, `Animations`, `UIManager`, `Autoplay`, `Symbol`, `DebugPanel`, `gsap`).
    *   **Exports:**
        *   `Game` class: Instantiated in `main.js`.
        *   `startSpinLoop`: Global function called by `ButtonHandlers.js` to begin the spin process across all reels.
    *   **Other:**
        *   Creates the main PIXI `Application` (`app`).
        *   Creates and manages the main PIXI containers (`reelContainer`, `uiContainer`, `winLineGraphics`, `overlayContainer`, `particleContainer`).
        *   Holds the array of `Reel` instances (`reels`).
        *   Runs the main `update` loop via `app.ticker`, which calls `update` on Reels, particles, and checks for spin completion.
        *   Wires up UI: Calls `ButtonFactory.createButton` passing handlers from `ButtonHandlers.js`.
        *   Sets `window.gameApp = this` to allow access from other modules (like `DebugPanel`).
        *   Contains logic for handling the end of a spin (`handleSpinEnd`) and triggering win evaluation or next steps (Autoplay/FreeSpins).
        *   Manages Free Spins UI indicator creation and updates.

---

**`./src//core/Symbol.js`**

*   **Purpose:** Defines the visual representation of a single symbol on the reel. It's a `PIXI.Sprite` subclass that loads the correct texture based on a symbol ID and provides methods for managing visual effects (filters).
*   **Importance:** Provides the visual building blocks for the reels. Encapsulates the symbol's appearance and basic state (like `isAnimating`).
*   **Links:**
    *   **Imports:** `pixi.js`, `config/gameSettings.js` (for size/positioning constants).
    *   **Exports:**
        *   `createSymbolGraphic`: Factory function used by `Reel.js` to create symbol instances.
        *   `SymbolSprite` class: The actual class representing the symbol sprite.
    *   **Other:** Relies on `PIXI.Assets.get(symbolId)` to retrieve textures preloaded likely in `Game.js`. Instances are held within the `symbols` array of each `Reel` instance.

---

**`./src//core/GameState.js`**

*   **Purpose:** Defines, initializes, and provides functions to update the central, shared state of the game. Holds all critical data like balance, bet amounts, spin status, feature flags (Autoplay, Turbo, Free Spins), win information, and debug flags.
*   **Importance:** Acts as the single source of truth for the game's current status. Allows different modules to access and modify state in a consistent way without needing direct references to each other, promoting decoupling.
*   **Links:**
    *   **Imports:** `config/gameSettings.js`, `config/paylines.js` (for default values and constants like `NUM_REELS`).
    *   **Exports:**
        *   `state`: The main state object, imported and read by almost every other module.
        *   `initGameState`: Called by `Game.js` on startup.
        *   `updateState`: Called by any module that needs to change the game state (e.g., `ButtonHandlers`, `WinEvaluation`, `FreeSpins`, `Autoplay`, `Game`, `DebugPanel`).

---

**`./src//config/gameSettings.js`**

*   **Purpose:** Contains global constants defining core game parameters like dimensions, reel setup (number, size, visibility), symbol IDs (scatter), feature parameters (free spins amount, default autoplay), bet levels, and background settings/colors.
*   **Importance:** Centralizes game configuration, making it easy to tweak parameters without searching through multiple files. Provides consistent values used across different modules.
*   **Links:**
    *   **Imports:** None.
    *   **Exports:** Various constants (`GAME_WIDTH`, `NUM_REELS`, `SYMBOL_SIZE`, `BET_PER_LINE_LEVELS`, etc.). Imported by numerous files (`Game`, `Reel`, `UIManager`, `GameState`, `WinEvaluation`, `PaylineGraphics`, `Symbol`, etc.).

---

**`./src//config/paylines.js`**

*   **Purpose:** Defines the paths of the winning paylines across the reels. Each line is an array specifying the row index (0-based from top) to check on each reel. Also exports the total number of paylines.
*   **Importance:** Defines how winning combinations are evaluated. Essential for the `WinEvaluation` module.
*   **Links:**
    *   **Imports:** None.
    *   **Exports:** `PAYLINES` array, `NUM_PAYLINES` constant. Imported primarily by `WinEvaluation.js` and `GameState.js` (for total bet calculation), possibly `ButtonHandlers.js`.

---

**`./src//config/symbolDefinitions.js`**

*   **Purpose:** Defines properties for each symbol type, including its ID, base payout values for different match counts (3, 4, 5), and potentially placeholder visual properties (color, text - though images are now used). Exports a derived `PAYTABLE` for easy lookup.
*   **Importance:** Provides the payout rules for the game. Crucial for `WinEvaluation.js` to calculate win amounts. Also used by `Game.js` to determine which symbol image assets to load.
*   **Links:**
    *   **Imports:** None.
    *   **Exports:** `SYMBOL_DEFINITIONS` array, `PAYTABLE` object. Imported by `WinEvaluation.js` (for `PAYTABLE`) and `Game.js` (for `SYMBOL_DEFINITIONS` asset loading).

---

**`./src//config/animationSettings.js`**

*   **Purpose:** Contains constants and potentially modifiable variables related to animation timings and behavior, such as spin acceleration/speed, stop delays, stagger times, tween durations, and multipliers for normal vs. turbo mode.
*   **Importance:** Centralizes control over the game's animation "feel" and speed. Allows easy adjustment of timings for different modes.
*   **Links:**
    *   **Imports:** None.
    *   **Exports:** Various constants and `let` variables (`spinAcceleration`, `maxSpinSpeed`, `baseSpinDuration`, `stopTweenDuration`, `REEL_STOP_STAGGER`, `winAnimDelayMultiplier`, turbo equivalents, etc.). Imported by `Reel.js`, `Game.js`, `Notifications.js`, `Animations.js`, `Autoplay.js`, `PaylineGraphics.js`, `TurboMode.js`, `FreeSpins.js`.

---

**`./src//config/reelStrips.js`**

*   **Purpose:** Defines the sequence of symbols (by ID) for each reel strip. This determines the possible outcomes when the reels stop.
*   **Importance:** This is the fundamental data defining the game's potential results and symbol distribution on each reel. Used by `Reel.js` to know which symbols to display and by `WinEvaluation.js` (indirectly via `Reel.stopIndex`) to determine results.
*   **Links:**
    *   **Imports:** None.
    *   **Exports:** `REEL_STRIPS` (an array of arrays). Imported by `Game.js` (to pass to `Reel` constructors) and potentially `WinEvaluation.js` or debug functions if needed for direct analysis.

---

**`./src//features/FreeSpins.js`**

*   **Purpose:** Manages the Free Spins game feature. Handles entering the mode (triggered by scatters), awarding spins, tracking remaining spins and total win, applying win multipliers, managing the flow between free spins, changing background visuals, displaying notifications, and exiting the mode.
*   **Importance:** Implements a key bonus feature of the slot game, providing players with spins that don't cost balance and often have enhanced winning potential.
*   **Links:**
    *   **Imports:**
        *   `config/gameSettings.js`, `config/animationSettings.js`: Reads configuration (spins awarded, colors, timings).
        *   `core/GameState.js` (`state`, `updateState`): Reads/writes `isInFreeSpins`, `freeSpinsRemaining`, `totalFreeSpinsWin`. Reads `lastTotalWin`.
        *   `ui/Notifications.js` (`showOverlayMessage`): Displays entry, retrigger, and exit messages.
        *   `ui/UIManager.js`: Calls `setButtonsEnabled` (to disable controls), `updateDisplays` (to refresh UI text).
        *   `ui/ButtonHandlers.js` (`startSpin`): Initiates each individual free spin.
        *   `gsap`, `pixi.js`: For animations (background color change, entry animation).
    *   **Exports:**
        *   `initFreeSpins`: Called by `Game.js` during setup.
        *   `enterFreeSpins`: Called by `WinEvaluation.js` when enough scatters land.
        *   `exitFreeSpins`: Called internally when spins run out.
        *   `handleFreeSpinEnd`: Called by `Game.js` after a spin completes *while* in free spins mode.
        *   `getFreeSpinsMultiplier`: Called by `WinEvaluation.js` (or wherever win calculation happens) to apply the multiplier.

---

**`./src//features/TurboMode.js`**

*   **Purpose:** Manages the Turbo Mode feature. Primarily responsible for applying the faster animation settings when Turbo Mode is active.
*   **Importance:** Provides players with an option to speed up gameplay by reducing animation durations and delays.
*   **Links:**
    *   **Imports:**
        *   `config/animationSettings.js`: Reads turbo-specific behavior flags (like `skipBounceInTurbo`, though this seems unused by current tween logic).
        *   `core/GameState.js` (`state`): Reads the `isTurboMode` flag.
        *   `ui/UIManager.js` (`updateTurboButtonState`): Used to update the button's visual state (though this import seems unused here, the UIManager function is likely called directly elsewhere).
    *   **Exports:**
        *   `initTurboMode`: Called by `Game.js` during setup, passing the `reels` array reference.
        *   `applyTurboSettings`: Called by `ButtonHandlers.js` when the turbo button is toggled.
    *   **Other:** Directly modifies properties (like `skipBounce`) on the `Reel` instances stored in `reelsRef`. The core application of turbo timings happens implicitly where modules read `state.isTurboMode` and choose settings accordingly (e.g., in `Game.js` when scheduling stops, or in `Reel.js` potentially).

---

**`./src//features/WinEvaluation.js`**

*   **Purpose:** Responsible for evaluating the game outcome after the reels have stopped. It checks all defined paylines for winning combinations, calculates the win amount based on the paytable, identifies winning symbols, checks for scatter symbol triggers, updates the game state with the results, and triggers corresponding effects (win line drawing, animations, free spins).
*   **Importance:** This module determines if and how much the player has won on a spin. It's the core logic connecting the stopped reel state to player rewards and feature triggers.
*   **Links:**
    *   **Imports:**
        *   `config/paylines.js`, `config/symbolDefinitions.js`, `config/gameSettings.js`: Reads payline definitions, payout tables, symbol IDs, and feature settings.
        *   `core/GameState.js` (`state`, `updateState`): Reads current bet, reel count; writes `lastTotalWin`, `winningLinesInfo`, `balance` (if not in FS). Reads `isInFreeSpins` to adjust balance update.
        *   `features/PaylineGraphics.js` (`drawWinLines`): Triggers the drawing of lines over winning symbols.
        *   `features/Animations.js` (`playWinAnimations`, `animateWinningSymbols`): Triggers win amount rollup/text and symbol animations.
        *   `features/FreeSpins.js` (`enterFreeSpins`): Triggers the Free Spins feature if enough scatters are found.
        *   `ui/UIManager.js` (`updateDisplays`): Updates the UI text (win, balance).
    *   **Exports:**
        *   `initWinEvaluation`: Called by `Game.js` during setup, passing the `reels` array reference.
        *   `evaluateWin`: Called by `Game.js` in `handleSpinEnd` after all reels have stopped.
    *   **Other:** Needs access to the stopped state of the reels (via `reelsRef` and the `getResultsGrid` helper function) to determine the symbols on screen.

---

**`./src//features/SpriteSheetAnimations.js`**

*   **Purpose:** Provides helper functions for loading sprite sheet assets (image + JSON data) and creating/managing `PIXI.AnimatedSprite` instances based on those sheets. Includes logic to temporarily replace a static symbol with a sprite sheet animation.
*   **Importance:** Enables the use of pre-rendered, frame-by-frame animations (like explosions, complex character movements) for symbol wins or other effects, offering more visual possibilities than simple tweening.
*   **Links:**
    *   **Imports:** `pixi.js`, `gsap`.
    *   **Exports:**
        *   `loadSpriteSheet`: Used to load sprite sheet assets (likely during game preload in `Game.js` or potentially `AnimationDemo.js`).
        *   `createAnimatedSprite`: Creates an instance of `PIXI.AnimatedSprite` from a loaded sheet.
        *   `playSpriteSheetAnimation`: Temporarily replaces a symbol with a playing animation.
        *   `createSpriteSheetAnimationFn`: A factory function to create animation functions suitable for registration with the `Animations.js` module. Used by `AnimationDemo.js`.

---

**`./src//features/Animations.js`**

*   **Purpose:** Manages visual effects related to wins and symbols. Includes a registry for custom symbol win animations, functions to play default/custom symbol animations (scaling, tinting, etc.), handles the "Big Win"/"Mega Win" text overlays and win amount rollup, and manages particle effects (creation, update loop).
*   **Importance:** Enhances the player experience by providing visual feedback and excitement for winning spins and specific symbol involvement. Adds visual polish to the game.
*   **Links:**
    *   **Imports:**
        *   `pixi.js`, `gsap`: For creating/animating graphics, text, and particles.
        *   `ui/UIManager.js` (`getWinRollupText`): Gets the reference to the win rollup text element.
        *   `config/animationSettings.js`, `config/gameSettings.js`: Reads timing multipliers and game dimensions.
    *   **Exports:**
        *   `registerSymbolAnimation`: Used by `AnimationDemo.js` (and internally) to define how specific symbols should animate on win.
        *   `initAnimations`: Called by `Game.js` during setup, passing containers.
        *   `animateWinningSymbols`: Called by `WinEvaluation.js` to animate the symbols involved in winning lines.
        *   `playWinAnimations`: Called by `WinEvaluation.js` to trigger win rollup, big win text, and particles based on the total win amount.
        *   `updateParticles`: Called continuously by the main game loop (`Game.js`) to update particle positions and lifecycle.
    *   **Other:** Adds elements to `overlayContainer` (win text) and `particleContainer`.

---

**`./src//features/Autoplay.js`**

*   **Purpose:** Manages the Autoplay feature logic. Checks if conditions are met to continue autoplay (flag active, spins remaining, sufficient balance, not in Free Spins/transition), decrements the spin counter, and schedules the next automatic spin after a delay. Stops autoplay if conditions are not met.
*   **Importance:** Implements the convenience feature allowing players to have the game spin automatically for a set number of rounds.
*   **Links:**
    *   **Imports:**
        *   `core/GameState.js` (`state`, `updateState`): Reads/writes autoplay state (`isAutoplaying`, `autoplaySpinsRemaining`). Reads other state like `isInFreeSpins`, `isTransitioning`, `balance`, `currentBetPerLine`.
        *   `ui/UIManager.js`: Calls `setButtonsEnabled`, `updateAutoplayButtonState`.
        *   `ui/ButtonHandlers.js` (`startSpin`): Initiates the next automatic spin.
        *   `config/animationSettings.js`, `config/paylines.js`: Reads timing delays and config for balance check.
    *   **Exports:** `handleAutoplayNextSpin`: Called by `Game.js` in `handleSpinEnd` if autoplay is active and not in free spins.

---

**`./src//features/AnimationDemo.js`**

*   **Purpose:** Serves as a demonstration and testing ground for registering various types of custom symbol animations using the `Animations.js` module. Shows examples of code-based (GSAP), filter-based (PIXI filters), and potentially sprite-sheet-based animations.
*   **Importance:** Provides clear examples of how to extend the game's visual feedback by creating unique animations for different symbols. Useful for developers learning the animation system.
*   **Links:**
    *   **Imports:**
        *   `features/Animations.js` (`registerSymbolAnimation`): Registers the demo animations.
        *   `features/SpriteSheetAnimations.js`: Imports functions for loading and using sprite sheets (though the example loading is commented out).
        *   `pixi.js`: Used for filter examples.
    *   **Exports:** `setupCustomAnimations`: Called once (likely by the small `Game.js` file) to register all the demo animations.

---

**`./src//features/PaylineGraphics.js`**

*   **Purpose:** Responsible for drawing the visual lines over the reels to indicate which paylines have resulted in a win. Handles the positioning, styling (color, thickness), and simple fade-in/fade-out animation of these lines.
*   **Importance:** Provides clear visual confirmation to the player about how their win was achieved, highlighting the specific symbols and path involved.
*   **Links:**
    *   **Imports:** `pixi.js`, `config/animationSettings.js`, `config/gameSettings.js` (for positioning and timings).
    *   **Exports:**
        *   `initPaylineGraphics`: Called by `Game.js` during setup, passing the `winLineGraphics` PIXI.Graphics object.
        *   `drawWinLines`: Called by `WinEvaluation.js` after wins are calculated, passing the details of the winning lines.
        *   `clearWinLines`: Called by `Game.js` (in `startSpinLoop`) before a new spin starts to remove lines from the previous spin.
    *   **Other:** Draws directly onto the `winLineGraphics` object provided during initialization. Calculates line coordinates based on symbol positions within their reel containers.

---

**`./src//utils/helpers.js`**

*   **Purpose:** A collection of general-purpose utility functions that don't belong to a specific feature or core module. Currently includes angle interpolation (`lerpAngle`) and an easing function (`easeOutQuad`).
*   **Importance:** Provides reusable helper logic that can be used by various parts of the application, promoting DRY (Don't Repeat Yourself) principles.
*   **Links:**
    *   **Imports:** None.
    *   **Exports:** Utility functions (`lerpAngle`, `easeOutQuad`). Potentially imported by modules needing these specific calculations (e.g., `Reel.js` might have used `lerpAngle` or easing previously, though current code doesn't show it).

---

**`./src//main.js`**

*   **Purpose:** The main entry point for the entire JavaScript application. Waits for the HTML DOM to be ready, then creates an instance of the `Game` class and calls its `init` method to start the game loading and initialization process.
*   **Importance:** Kicks off the entire game. It's the first script executed (after dependencies) that starts the game logic.
*   **Links:**
    *   **Imports:** `core/Game.js`.
    *   **Exports:** None.
    *   **Other:** Interacts with the DOM (`document.addEventListener`, `document.getElementById`) to find the container for the game canvas. Handles top-level errors during game initialization.

---

**`./src//styles/main.css`**

*   **Purpose:** Provides CSS rules for styling the HTML page that hosts the game. Includes basic body layout, styling for the PixiJS canvas element (border, background, shadow), and styles for the DOM-based `info-overlay` element.
*   **Importance:** Defines the visual appearance of the elements *outside* the PixiJS canvas and basic presentation of the canvas itself within the webpage.
*   **Links:**
    *   **Imports/Exports:** None (CSS file).
    *   **Other:** Styles HTML elements defined in `index.html`, including the container used by `main.js` (`#game-container`) and the element used by `InfoOverlay.js` (`.info-overlay`).