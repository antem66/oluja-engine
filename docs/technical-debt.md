# Technical Debt Log

This document tracks known technical issues, areas for improvement, and potential refactoring opportunities in the Oluja Slot Engine codebase.

## Architecture / Refactoring Opportunities

*   **Area:** UI Panel Layout (`src/config/uiPanelLayout.js`, `src/ui/UIManager.js`)
    *   **Opportunity:** Enhance the layout system defined in `uiPanelLayout.js`. The current static coordinate calculation might become rigid. Consider implementing a more dynamic layout mechanism (e.g., relative positioning, grid/flex-like logic) within `UIManager._buildPanelFromConfig` to better handle different combinations of enabled/disabled buttons.
    *   **Status:** Future Enhancement.

*   **Area:** Text Element Creation (`src/ui/UIManager.js`)
    *   **Opportunity:** The Balance, Bet, and Win text elements are still created imperatively in `_createTextDisplays`. For ultimate consistency with the data-driven button approach, these could also be defined in a layout configuration file.
    *   **Status:** Future Enhancement (Low Priority).

*   **Area:** Plugin State Management (e.g., `src/plugins/AutoplayPlugin.js`)
    *   **Opportunity:** Plugins like `AutoplayPlugin` still access the global `state` object directly in some places (e.g., checking `state.isSpinning`, `state.isInFreeSpins`). Ideally, plugins should rely solely on the `newState` object provided within the `game:stateChanged` event payload for reacting to state.
    *   **Status:** Refinement Task.

*   **Area:** Turbo Mode (`src/features/TurboMode.js`)
    *   **Opportunity:** Apply the same data-driven UI pattern used for Autoplay to the Turbo button/feature. This would involve moving its logic into a `TurboPlugin`, removing Turbo-specific code from `UIManager`, and ensuring the plugin updates the Turbo button's visual state via `UIManager.setButtonVisualState`.
    *   **Status:** Suggested Next Step.
