# V2 Slot Engine: Server Integration

This document outlines the client-side (`engine-core`) integration points and expected interactions with the backend `game-server`.

## 1. Principle: Server Authority

For any real-money or regulated gaming environment, the `game-server` **must** be the single source of truth for:

*   **Game Outcomes:** Random Number Generation (RNG) and determination of final reel positions/results.
*   **Win Calculation:** Calculating wins based on the authoritative results and game math/configuration.
*   **Player State:** Managing player balance, session data, and persistent game state (e.g., feature progress if applicable).

The client (`engine-core`) is responsible for:

*   Sending player actions (bets, spin requests) to the server.
*   Visually presenting the results received from the server.
*   Providing an engaging user interface and experience.

**The client MUST NOT determine game outcomes or final win amounts independently.**

## 2. `ApiService` (`engine-core/src/services/ApiService.ts`)

*   **Purpose:** Encapsulates all communication logic between the client engine and the backend `game-server`.
*   **Implementation:** Typically uses the browser's `fetch` API or a library like `axios`.
*   **Core Methods (Examples):**
    *   `initializeSession(params): Promise<SessionData>`: Called on game load to establish/resume a player session.
    *   `requestSpin(betInfo): Promise<SpinResult>`: Sends the current bet configuration and requests a game round result.
    *   `requestFeatureAction(featureId, actionData): Promise<FeatureResult>`: Sends data related to player choices within a specific feature (e.g., a pick in a bonus game).
    *   `ping(): Promise<void>`: Optional method for keep-alive or connectivity checks.
*   **Error Handling:** Must implement robust error handling for network issues, server errors (e.g., 4xx, 5xx status codes), and potentially malformed responses.
*   **Authentication/Session Management:** Handles sending necessary authentication tokens or session identifiers with each request, often received during `initializeSession`.

## 3. API Contract (Client Expectations)

The `ApiService` expects the `game-server` to provide well-defined API endpoints and response structures. While the exact API design is up to the backend team, the client typically expects:

*   **Session Initialization (`SessionData`):**
    *   Player balance.
    *   Current bet configuration (if resuming).
    *   Current game state (e.g., if player is already in Free Spins).
    *   Available bets, game limits.
    *   Session token/ID.
*   **Spin Result (`SpinResult`):**
    *   Final symbol results for each reel/position (`reelResults: string[][]` or similar).
    *   Information about winning lines/ways/clusters (`winningLinesInfo`).
    *   Total win amount for the spin.
    *   Updated player balance.
    *   Feature triggers (e.g., `triggeredFeature: 'freeSpins'`, `spinsAwarded: 10`).
    *   Any state changes related to progressive features or collections.
*   **Feature Result (`FeatureResult`):**
    *   Outcome of the feature action (e.g., prize revealed).
    *   Updated feature state.
    *   Total win from the feature action/round.
    *   Updated player balance.

**Shared Types:** It is highly recommended that the client (`ApiService`) and the `game-server` share TypeScript types for these API payloads. This can be achieved by creating a dedicated `packages/shared-types` package in the monorepo or by having the `game-server` depend on `packages/game-configs` if appropriate.

## 4. Integration with Engine Logic (Zustand Actions)

Core engine logic, primarily within Zustand actions, orchestrates calls to the `ApiService` and handles the responses:

1.  **Game Load:** An initialization action calls `ApiService.initializeSession()`.
    *   On success, updates the Zustand store with the initial player balance, game state, available bets, etc.
    *   On failure, sets an error state to be displayed by the UI.
2.  **Spin Request (`startSpin` Action):**
    *   Sets `isSpinning` state to true (or an intermediate `isRequestingSpin` state).
    *   Collects current bet info from the Zustand store.
    *   Calls `ApiService.requestSpin(betInfo)`.
    *   **(Client-Side Animation Starts):** Reels might start spinning visually *before* the server response arrives for better perceived responsiveness (optional).
    *   **On Response Success (`SpinResult` received):**
        *   Updates Zustand store with authoritative `reelResults`, `winningLinesInfo`, `lastTotalWin`, `balance`, `triggeredFeature`, etc., provided by the server.
        *   The rest of the engine (reel components, win presentation logic, feature controllers) reacts declaratively to these state updates to display the results visually.
        *   Sets `isSpinning` state back to false (after presentation).
    *   **On Response Failure:**
        *   Sets an error state in Zustand.
        *   Resets `isSpinning` state.
        *   UI displays an appropriate error message.
3.  **Feature Actions:** Similar flow for interactive features – UI triggers action, action calls `ApiService`, response updates state, UI reacts.

## 5. Handling Latency

*   **Visual Feedback:** Start visual feedback (like reel spinning) optimistically before the server response arrives to make the game feel more responsive.
*   **Loading Indicators:** Display loading indicators during server request round-trips if they are expected to take noticeable time.
*   **Timeouts:** Implement reasonable timeouts in the `ApiService` to handle unresponsive server scenarios.

By encapsulating server communication within the `ApiService` and using Zustand actions to manage the request/response lifecycle and update state, the engine maintains a clear separation between client-side presentation logic and server-side authority.
