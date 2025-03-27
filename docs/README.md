# Heavens Ten Deluxe - Code Documentation

## 1. Overview

This document provides an overview of the "Heavens Ten Deluxe" slot game codebase, designed to help new developers understand the structure, core mechanics, and features. The game is built using JavaScript modules and the PixiJS library for rendering.

## 2. Project Structure

The codebase is organized within the `/src` directory:

```
src/
├── main.js             # Entry point, initializes the game
├── config/             # Configuration files for game settings, symbols, paylines, etc.
├── core/               # Core game logic (Game class, Reel class, Game State)
├── features/           # Modules for specific game features (Win Eval, Free Spins, Turbo, etc.)
├── styles/             # CSS styles (if any, currently basic)
├── ui/                 # UI elements management (Buttons, Text Displays)
└── utils/              # Utility functions (helpers)
```

## 3. Core Game Loop & Mechanics

*   **`main.js`**: Waits for the DOM to load, creates a `Game` instance, and calls its `init()` method.
*   **`core/Game.js`**:
    *   The main class orchestrating the game.
    *   `constructor`: Gets the canvas container.
    *   `init()`: Sets up the PixiJS application, creates containers (reels, UI, overlays), initializes reels, sets up UI elements, and starts the game loop (`app.ticker`).
    *   `setupUI()`: Creates and positions static UI elements like the title, panel, and buttons (using `ButtonFactory`). Initializes `UIManager`.
    *   `update()`: The main game loop function called by the PixiJS ticker. Updates all reels and checks if the spin has ended.
    *   `handleSpinEnd()`: Called when all reels stop moving. Triggers win evaluation and handles the next action (autoplay, free spins, enabling buttons).
    *   `startSpinLoop()`: Called by button handlers. Initiates the spin, calculates target stop times for each reel based on normal/turbo mode, and calls `reel.scheduleStop()`.
*   **`core/Reel.js`**:
    *   Represents a single reel.
    *   `constructor`: Creates the container, symbols, and blur filter.
    *   `startSpinning()`: Sets the state to 'accelerating', determines a random `stopIndex`.
    *   `scheduleStop()`: Stores the absolute `targetStopTime` calculated by `Game.js`.
    *   `update()`: Handles state transitions (accelerating, spinning, tweeningStop, stopped).
        *   In 'accelerating'/'spinning', moves the reel position based on speed.
        *   Checks if the current time (`now`) is close to `targetStopTime` to initiate the 'tweeningStop' state.
        *   In 'tweeningStop', uses `lerpAngle` and an easing function (`easeOutQuad`) to smoothly animate the reel `position` from its current spot to the `finalStopPosition` over the `stopTweenDuration`.
    *   `alignReelSymbols()`: Updates the visual symbols based on the current `position`.
*   **`core/GameState.js`**:
    *   Exports a central `state` object holding all mutable game data (balance, bet, win, spinning status, feature flags, etc.).
    *   `initGameState()`: Resets the state to default values.
    *   `updateState()`: A function to merge updates into the state object.
*   **`core/Symbol.js`**: Creates the visual representation (PixiJS Container with Graphics/Text) for a single symbol based on its definition.

## 4. Configuration (`/src/config/`)

*   **`animationSettings.js`**: Defines speeds, delays, and durations for reel animations (acceleration, max speed, stagger, base duration, tween duration). Includes separate constants for Turbo mode.
*   **`gameSettings.js`**: Defines core game parameters (dimensions, number of reels, symbols visible, reel width, symbol size, scatter ID, free spins rules, bet levels, background colors, `ENABLE_FREE_SPINS` flag).
*   **`paylines.js`**: Defines the paths for each payline as arrays of row indices (0-3) across the reels. Exports `PAYLINES` and `NUM_PAYLINES`.
*   **`reelStrips.js`**: Defines the sequence of symbol IDs for each reel strip (`REEL_STRIPS`).
*   **`symbolDefinitions.js`**: Defines properties for each symbol ID (color, text, payout table). Exports `SYMBOL_DEFINITIONS` and a derived `PAYTABLE` for easy lookup.

## 5. Features (`/src/features/`)

*   **`WinEvaluation.js`**:
    *   `evaluateWin()`: Called after reels stop.
    *   `getResultsGrid()`: Determines the visible symbols based on each reel's `stopIndex`.
    *   Iterates through `PAYLINES`, checks the grid for consecutive matching symbols from left-to-right using the `PAYTABLE`.
    *   Calculates total win and identifies winning line details.
    *   Checks for scatter count.
    *   Updates game state (`lastTotalWin`, `balance`, `winningLinesInfo`).
    *   Triggers win animations and graphics (`PaylineGraphics.js`, `Animations.js`).
    *   Triggers free spins (`FreeSpins.js`) if conditions are met and `ENABLE_FREE_SPINS` is true.
*   **`FreeSpins.js`**: (Assumed structure - needs implementation details) Handles entering/exiting free spins mode, tracking remaining spins, potentially changing background/music. `enterFreeSpins` is called by `WinEvaluation`.
*   **`TurboMode.js`**:
    *   `applyTurboSettings()`: Currently minimal, mainly handles legacy `skipBounce` flag (unused by current tween logic). The core turbo speed logic is now handled directly in `Game.js`'s `startSpinLoop` by checking `state.isTurboMode` and using turbo constants from `animationSettings.js`.
*   **`Autoplay.js`**: (Assumed structure) Handles starting/stopping autoplay sequences and triggering spins automatically. `handleAutoplayNextSpin` is called by `Game.js`.
*   **`PaylineGraphics.js`**: `drawWinLines` function takes winning line info and draws the lines on the reels. `clearWinLines` removes them.
*   **`Animations.js`**: `playWinAnimations` triggers general win effects (e.g., sounds, particles). `animateWinningSymbols` applies effects directly to the winning symbol instances. `updateParticles` updates ongoing particle effects.

## 6. UI (`/src/ui/`)

*   **`UIManager.js`**:
    *   `initUIManager`: Creates and positions text displays (Balance, Win, Bet) using styles passed from `Game.js`. Stores references.
    *   `updateDisplays`: Updates the text content based on the current `GameState`.
    *   `setButtonsEnabled`: Enables/disables buttons based on game state (spinning, free spins).
    *   `updateAutoplayButtonState`, `updateTurboButtonState`: Update visual appearance (color, icon) of specific buttons based on their active state.
*   **`ButtonFactory.js`**: (Assumed structure) A utility to create standardized button graphics and interactive elements. Used by `Game.js`.
*   **`ButtonHandlers.js`**: Contains the functions executed when UI buttons are clicked (e.g., `startSpin`, `toggleTurbo`, `toggleAutoplay`, `increaseBet`, `decreaseBet`). These handlers update the `GameState` and trigger actions in other modules (like `Game.js` or `TurboMode.js`).
*   **`Notifications.js`**: (Assumed structure) Handles displaying temporary messages or effects (like flashing).
*   **`InfoOverlay.js`**: (Assumed structure) Manages the separate DOM overlay for displaying info/paytable.

## 7. Utilities (`/src/utils/`)

*   **`helpers.js`**: Contains utility functions like `lerpAngle` (for tweening reel position correctly with wrap-around) and easing functions (`easeOutQuad`).

## 8. Adding New Features

1.  **Configuration:** Add any necessary settings to `/src/config/` files (e.g., new symbol payouts, feature flags).
2.  **State:** Add any required state variables to `/src/core/GameState.js`.
3.  **Core Logic:**
    *   If it's a core mechanic change, modify `Game.js` or `Reel.js`.
    *   If it's a distinct feature, create a new file in `/src/features/`.
4.  **UI:**
    *   Add buttons or displays in `Game.js` (`setupUI`).
    *   Add corresponding text elements or references in `UIManager.js`.
    *   Create button handlers in `ButtonHandlers.js`.
    *   Update `UIManager.js` to manage the new elements' state/appearance if needed.
5.  **Integration:** Call new feature logic from appropriate places (e.g., call a new feature's evaluation function from `Game.js`'s `handleSpinEnd`, trigger UI updates from handlers or feature modules).
6.  **Testing:** Thoroughly test the new feature and its interaction with existing ones (especially state changes, Turbo mode, Autoplay, Free Spins).
