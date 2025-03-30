# Oluja Engine: UI Architecture

**Last Updated:** [Current Date - Please update manually]

## 1. Overview

The UI system in the Oluja Engine is designed to be modular, data-driven (where possible), and manageable. It primarily revolves around the `UIManager` class (`src/ui/UIManager.js`) and supporting modules like the `ButtonFactory` and configuration files.

Key goals of the UI architecture:

*   **Centralized Management:** `UIManager` acts as the main coordinator for creating, updating, and managing the state of primary UI elements (buttons, text displays).
*   **Reusability:** The `ButtonFactory` (`src/ui/ButtonFactory.js`) creates consistent, interactive button components.
*   **Configuration-Driven Layout:** The layout and properties of the main control buttons are defined in `src/config/uiPanelLayout.js`, allowing easy modification without changing `UIManager` code directly.
*   **Decoupling:** UI elements primarily react to game state changes through events (`game:stateChanged`) rather than being directly manipulated by disparate game logic modules.
*   **Plugin Interaction:** Provides mechanisms for plugins (like `AutoplayPlugin`) to interact with and update specific UI elements (e.g., the Autoplay button's visual state).

## 2. Core Components

*   **`UIManager` (`src/ui/UIManager.js`)**
    *   **Responsibilities:**
        *   Instantiated by `Game.js` and receives dependencies (logger, eventBus, featureManager, animationController, parentLayer).
        *   Initializes the main UI layer (`layerUI`).
        *   Builds the primary button panel using `_buildPanelFromConfig` based on `uiPanelLayout.js`.
        *   Creates static text displays (Balance, Bet, Win labels and values) via `_createTextDisplays`.
        *   Manages a map (`this.buttons`) of created button instances, keyed by their configured name (e.g., 'spin', 'autoplay').
        *   Listens to `game:stateChanged` events via `_handleStateChange` to update text displays and button enabled states.
        *   Provides methods for controlling UI elements, such as:
            *   `setButtonsEnabled(currentState)`: Toggles interactability based on game state.
            *   `getButton(buttonName)`: Retrieves a specific button instance.
            *   `setButtonVisualState(buttonName, isActive, activeIcon, inactiveIcon)`: Allows external modules (like plugins) to update a button's icon and active appearance.
            *   `animateWin(data)` / `animateBalance(data)`: Handles win/balance rollup animations (registered with `AnimationController`).
            *   `animateSpinButtonRotation()` / `stopSpinButtonRotation()`: Controls the spin button's animation.
        *   Handles its own cleanup in the `destroy()` method.
    *   **Key Methods:**
        *   `init(uiStyles, initialState)`: Sets up the UI.
        *   `_buildPanelFromConfig()`: Reads `uiPanelLayout.js` and uses `ButtonFactory` to create buttons.
        *   `_createTextDisplays(...)`: Creates the main text labels and value displays.
        *   `_handleStateChange(eventData)`: Reacts to state changes to update the UI.
        *   `getButton(buttonName)` / `setButtonVisualState(...)`: Public API for interacting with buttons.

*   **`ButtonFactory` (`src/ui/ButtonFactory.js`)**
    *   **Responsibilities:** Provides the `createButton` function.
    *   Creates interactive `PIXI.Container`-based buttons with support for:
        *   Text labels (optional).
        *   SVG or Texture-based icons (loaded via `loadButtonAssets`).
        *   Click/tap event handling (triggering a provided `onClick` callback).
        *   Basic hover/active visual feedback (using GSAP).
        *   Methods like `updateIcon` and `setActiveState` for dynamically changing appearance.
    *   Used exclusively by `UIManager._buildPanelFromConfig` and potentially directly by plugins if they need to create custom UI elements.

*   **`uiPanelLayout.js` (`src/config/uiPanelLayout.js`)**
    *   **Responsibilities:** Defines the configuration for the main control buttons displayed in the bottom UI panel.
    *   An array of objects, where each object represents a button and specifies:
        *   `name`: A unique identifier (e.g., 'spin', 'autoplay', 'betIncrease').
        *   `position`: { x, y } coordinates.
        *   `size`: { width, height } dimensions.
        *   `icon`: The initial asset alias for the button's icon.
        *   `action`: Defines what happens on click (e.g., `{ type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'spin' } }`).
        *   `featureFlag` (optional): Associates the button with a feature flag from `FeatureManager`.
    *   This data-driven approach allows rearranging, adding, or removing buttons by modifying this file without touching `UIManager.js` code.

*   **Plugins (e.g., `src/plugins/AutoplayPlugin.js`)**
    *   **Interaction:** Plugins that need to affect the UI receive the `UIManager` instance as a dependency.
    *   They typically interact by:
        *   Listening to `game:stateChanged` to understand the current game context.
        *   Calling `uiManager.setButtonVisualState(...)` to update the appearance of buttons related to their feature (e.g., toggling the Autoplay button icon/state).
        *   Potentially creating their own specific UI elements if needed (though often, interacting with existing UIManager-controlled elements is preferred).

## 3. Data Flow & Updates

1.  **Initialization:** `Game` creates `UIManager`, `UIManager` reads `uiPanelLayout.js` and creates buttons/texts based on initial state.
2.  **User Interaction:** User clicks a button.
3.  **Event Emission:** The button's `onClick` handler (configured in `uiPanelLayout.js`) typically emits an event via the shared `eventBus` (e.g., `ui:button:click` with the button name).
4.  **State Change:** A relevant module (often `GameState` itself, or potentially a plugin) listens for the button click event and calls `updateState` with the necessary changes.
5.  **State Event:** `GameState.updateState` detects changes and emits `game:stateChanged` with the details.
6.  **UI Reaction:** `UIManager._handleStateChange` listens for `game:stateChanged`.
7.  **UI Update:** Based on the `newState` and `updatedProps` in the event payload, `UIManager` updates:
    *   Text displays (`updateOtherDisplays`).
    *   Button enabled states (`setButtonsEnabled`).
    *   Potentially triggers animations (like balance rollup via `AnimationController`).
8.  **Plugin Reaction:** Plugins also listen for `game:stateChanged`. If the change affects their feature, they might call `uiManager.setButtonVisualState` to update the specific button's appearance.

## 4. Styling

*   **Text Styles:** Basic text styles (`PIXI.TextStyle`) are defined in `Game.js` (`_initCoreModules`) and passed to `UIManager.init`. These could potentially be moved to a dedicated config file.
*   **Button Appearance:** Button icons (SVGs) are loaded in `ButtonFactory.loadButtonAssets`. Visual states (hover, active) are handled within `createButton` using GSAP.

## 5. Extensibility

*   **Adding/Modifying Buttons:** Edit `src/config/uiPanelLayout.js`.
*   **Changing Text Styles:** Modify the `uiStyles` object creation in `Game.js` or move it to a config file.
*   **Adding New UI Sections:** For entirely new UI areas (not part of the main panel), a new dedicated manager class similar to `UIManager` could be created and managed by `Game.js`, placed on an appropriate layer.
*   **Plugin UI:** Plugins can manage simple state updates on existing buttons via `setButtonVisualState`. For complex custom UI, a plugin could create its own PIXI elements and add them to a container provided as a dependency (like `layerUI`), but this should be done carefully to avoid conflicts with `UIManager`.
