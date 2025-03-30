# Oluja Engine: State Management (`src/core/GameState.js`)

**Last Updated:** March 30, 2024

## 1. Overview

The Oluja Engine utilizes a centralized approach to state management through the `src/core/GameState.js` module. This module exports a single reactive `state` object and functions to initialize, update, and destroy it.

The primary goal is to have a single source of truth for mutable game data that various modules need to access or modify, while providing a mechanism (events) to react to changes.

## 2. The `state` Object

This is a plain JavaScript object containing key properties that define the current status of the game. Examples include:

*   `balance`: The player's current balance.
*   `currentBetPerLine`: The bet amount per payline.
*   `currentTotalBet`: The calculated total bet for a spin.
*   `currentCurrency`: The currency code (e.g., 'EUR').
*   `isSpinning`: Boolean flag indicating if reels are currently spinning.
*   `isAutoplaying`: Boolean flag for autoplay status.
*   `autoplaySpinsRemaining`: Number of autoplay spins left.
*   `isTurboMode`: Boolean flag for turbo mode.
*   `isInFreeSpins`: Boolean flag indicating if the free spins feature is active.
*   `freeSpinsRemaining`: Number of free spins left.
*   `totalFreeSpinsWin`: Accumulated win during the current free spins round.
*   `lastTotalWin`: The total win amount from the most recently completed spin.
*   `winningLinesInfo`: Information about the winning lines from the last spin.
*   `isDebugMode`: Flag indicating if the debug panel is active.
*   `forceWin`: Debug flag to force a win on the next spin (used by `ApiService` mock).
*   `isFeatureTransitioning`: Flag to prevent actions during transitions (e.g., FS entry/exit).
*   *(Potentially others as features are added)*

**Important:** While the client currently updates `balance` based on mock results, in a production environment with a real server, critical state like `balance`, `isInFreeSpins`, `freeSpinsRemaining`, etc., **must** ultimately be driven by authoritative data received from the server (`ApiService` events like `server:spinResultReceived`, `server:balanceUpdated`).

## 3. Core Functions

*   **`initGameState(initialState)`:**
    *   Called once during game startup (`main.js`).
    *   Takes an `initialState` object (typically loaded from config or a server response).
    *   Deep copies the `initialState` into the internal `state` object.
    *   Subscribes to necessary events (e.g., `autoplay:requestStop` to handle stopping autoplay).
    *   Logs the initialization.

*   **`updateState(updates)`:**
    *   The **primary way** modules should modify the game state.
    *   Takes an `updates` object containing key-value pairs of properties to change (e.g., `{ isSpinning: true, balance: 99.7 }`).
    *   Iterates through the `updates`.
    *   For each property, it compares the new value with the current value in the `state` object.
    *   If a value has changed, it updates the `state` object and records the property name.
    *   After processing all updates, if any properties were changed, it emits a `game:stateChanged` event.
    *   The `game:stateChanged` event payload includes:
        *   `updatedProps`: An array of strings listing the names of the properties that changed.
        *   `newState`: A reference to the complete, updated `state` object.
    *   This event-based notification allows other modules (like `UIManager`, plugins) to react to state changes without needing direct references or polling.

*   **`destroyGameState()`:**
    *   Called during game shutdown (`Game.destroy()`).
    *   Resets the internal `state` object (e.g., to `null` or an empty object).
    *   Unsubscribes from any events the `GameState` module was listening to.

## 4. Usage Pattern

1.  **Reading State:** Modules import the `state` object directly to read current values:
    ```javascript
    import { state } from '../core/GameState.js';

    function checkBalance() {
      if (state.balance < state.currentTotalBet) {
        // ... handle insufficient funds ...
      }
    }
    ```

2.  **Updating State:** Modules import and call `updateState` with an object containing only the properties they need to change:
    ```javascript
    import { updateState } from '../core/GameState.js';

    function startSpinAction() {
      // ... other logic ...
      updateState({ isSpinning: true });
      // ... maybe update balance if not FS ...
      const newBalance = state.balance - state.currentTotalBet;
      updateState({ balance: newBalance }); 
    }
    ```

3.  **Reacting to State Changes:** Modules subscribe to the `game:stateChanged` event via the `EventBus` and check the `updatedProps` array or the `newState` object in the event payload:
    ```javascript
    // In UIManager.js (simplified)
    _handleStateChange(eventData) {
        const { newState, updatedProps } = eventData;
        if (updatedProps.includes('balance') || updatedProps.includes('currentCurrency')) {
           this.balanceText.text = this._formatMoney(newState.balance, newState.currentCurrency);
        }
        if (updatedProps.includes('isSpinning')) {
           this.setButtonsEnabled(newState);
        }
        // ... etc ...
    }
    ```

## 5. Philosophy & Future

*   **Single Source of Truth:** Avoids state duplication and synchronization issues.
*   **Decoupling:** `updateState` and the `game:stateChanged` event decouple state modification from state consumption.
*   **Server Authority:** The architecture is designed so that `updateState` can eventually be called primarily in response to server events, making the server the ultimate source of truth for critical data.
