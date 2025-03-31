# Roadmap: Phase 3 - State Management & Basic Interaction

**Reference Docs:**
*   `docs/v2/02-engine-core-deep-dive.md` (State Management, Components/UI)
*   `docs/v2/08-server-integration.md` (Client State Role)

**Goal:** Integrate Zustand for state management, define the core application state structure, implement basic UI elements (Spin button, balance display), and connect UI interactions to update the state. Link symbol display to state.

**Prerequisites:** Phase 2 (Core Rendering & Static Display) Completed.

**Outcome:** The statically rendered game now has a functional state store. UI elements like a Spin button trigger state changes (e.g., `isSpinning` flag), and displays reflect initial state values (e.g., balance). Symbols displayed are driven by state, although reel animation isn't implemented yet.

**Key Steps & Tasks:**

1.  **Implement Zustand Store (`engine-core`):**
    *   `[Task]` Set up Zustand store (`src/state/store.ts`) using `create()`.
    *   `[Task]` Define `initialState.ts` with default values for core slices: `balance`, `bet`, `reelSymbols` (initial grid based on config), `isSpinning`, `lastTotalWin`, `activeFeature`, `errorState` etc. (Refer to `docs/v2/02...` and `docs/v2/08...` for state needs).
    *   `[Task]` Define basic state interfaces/types in `src/state/types.ts`.
    *   `[Task]` Implement core actions (inline or in `src/state/actions/`) like `initializeState(config, sessionData)`, `setSpinning(flag)`, `setBalance(amount)`, `setError(error)`. For now, `startSpin` action just toggles `isSpinning`.
    *   `[Task]` Implement basic selectors (inline or in `src/state/selectors/`) for accessing state slices.
    *   `[Task]` Implement `useGameState` hook (`src/hooks/useGameState.ts`) providing typed access to state via selectors.
    *   `[Task]` Add unit tests for actions and selectors.
    *   `[Task]` (Optional) Integrate Zustand DevTools middleware.
2.  **Initialize State on Load (`engine-core`):**
    *   `[Task]` In `<GameContainer>`, after config is available (and potentially after a mock `initializeSession` call in later phases), call an `initializeState` action to populate the store with starting balance, bet, initial reel symbols based on config, etc.
3.  **Connect Symbol Display to State (`engine-core`):**
    *   `[Task]` Modify `StandardReelStrip` (and potentially `BaseSymbol` or the `renderSymbol` function):
        *   Use `useGameState` to select the relevant portion of the `reelSymbols` state for its `reelIndex`.
        *   Render symbols based on the symbol IDs currently in the state, not the static initial config.
    *   `[Task]` Verify that the symbols displayed now match the initial state set in the store.
4.  **Implement Basic UI Components (`engine-core`):**
    *   `[Task]` Implement `<Button>` (`src/components/ui/Button.tsx`) with basic visual states (idle/hover/down using textures or tint) and an `onClick` prop. Ensure it handles pointer/touch events. Implement basic keyboard accessibility (focusable, activation).
    *   `[Task]` Implement `<TextDisplay>` (`src/components/ui/TextDisplay.tsx`) using `@pixi/react <Text>`, accepting `text`, style props.
    *   `[Task]` Implement `<UIOverlay>` (`src/components/ui/UIOverlay.tsx`) as a container for UI elements.
    *   `[Task]` Write basic component tests (RTL) focusing on prop handling and callbacks.
5.  **Integrate UI Elements & State (`engine-core` / `games/*`):
    *   `[Task]` Add `<UIOverlay>` to `<GameContainer>`.
    *   `[Task]` Within `<UIOverlay>` (or components it renders):
        *   Render a `<Button>` for the Spin action. Connect its `onClick` prop to call the `startSpin` Zustand action via `useGameState`.
        *   Render a `<TextDisplay>` for the balance. Use `useGameState` to select the `balance` state and pass it as the `text` prop (formatted as needed).
        *   Render `<TextDisplay>` elements for Bet, Win amounts (initially showing 0 or default values from state).
    *   `[Task]` Verify: Balance display shows initial state value. Clicking Spin button updates the `isSpinning` state in the store (can verify with Zustand DevTools or logging).

**Definition of Done:**
*   Zustand store is implemented with core state slices and basic actions/selectors.
*   Initial game state (balance, initial reels) is loaded into the store on startup.
*   Reel components (`StandardReelStrip`, `BaseSymbol`) display symbols based on the `reelSymbols` state slice.
*   Basic UI components (`Button`, `TextDisplay`, `UIOverlay`) are implemented.
*   A Spin button exists and correctly triggers the `startSpin` action, updating the `isSpinning` state.
*   A Balance display exists and correctly shows the value from the state store.
*   Unit/Component tests for state logic and basic UI components pass.

**Tracking:**
*   Create tickets for each `[Task]`, track progress.
*   Conduct code reviews for store setup and UI components.
*   Hold phase gate review: Demonstrate UI elements reflecting state and the Spin button triggering a state change. Confirm state management approach before Phase 4.
