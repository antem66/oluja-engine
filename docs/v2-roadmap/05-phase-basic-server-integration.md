# Roadmap: Phase 5 - Basic Server Integration

**Reference Docs:**
*   `docs/v2/08-server-integration.md` (ApiService, API Contract)
*   `docs/v2/02-engine-core-deep-dive.md` (State Management, Services)

**Goal:** Implement the client-side `ApiService` and integrate the basic spin cycle (from Phase 4) with a minimal `game-server` backend. Replace client-side mock results with authoritative server responses for standard spins. Establish session initialization.

**Prerequisites:**
*   Phase 4 (Standard Game Loop & Animation) Completed.
*   A minimal `game-server` backend is available, capable of:
    *   Handling a basic session initialization request (e.g., returning initial balance).
    *   Handling a `/spin` request (receiving bet info).
    *   Generating a simple, authoritative RNG result (e.g., random stop positions for standard reels based on basic config).
    *   Calculating line wins based on the RNG result.
    *   Returning a `SpinResult` payload (including `reelResults`, `winningLinesInfo`, `totalWin`, updated `balance`).

**Outcome:**
*   `ApiService` is implemented and communicates with the backend.
*   Game initializes state (e.g., balance) based on a server response.
*   Clicking Spin triggers a server request via `ApiService`.
*   Reel stopping positions and win presentation (lines, symbols, win amount) are driven by the data received in the `SpinResult` from the server.
*   Player balance updates according to the server response.
*   The core client-server communication loop for a standard spin is validated.

**Key Steps & Tasks:**

1.  **Implement `ApiService` (`engine-core`):**
    *   `[Task]` Create `src/services/ApiService.ts`.
    *   `[Task]` Implement `initializeSession(params): Promise<SessionData>` method using `fetch` or `axios` to call the server's init endpoint.
    *   `[Task]` Implement `requestSpin(betInfo): Promise<SpinResult>` method to call the server's `/spin` endpoint.
    *   `[Task]` Implement basic URL/endpoint configuration (potentially using environment variables via Vite).
    *   `[Task]` Implement basic error handling for network errors and non-2xx responses.
    *   `[Task]` Define placeholder TypeScript interfaces for `SessionData` and `SpinResult` (ideally these will come from a shared types package later or match `game-server` definitions).
    *   `[Task]` Write unit tests for `ApiService` methods (mocking `fetch`/`axios`).
2.  **Integrate Session Initialization (`engine-core`):**
    *   `[Task]` Modify the `initializeState` Zustand action (or create a new dedicated action).
    *   `[Task]` Call `ApiService.initializeSession()` within this action.
    *   `[Task]` On success, use the `SessionData` response to populate the initial state (balance, etc.) in the Zustand store.
    *   `[Task]` On failure, set the global error state.
    *   `[Task]` Update `<GameContainer>` or the main App component to trigger this initialization logic on load.
3.  **Refactor Spin Cycle Action (`engine-core`):**
    *   `[Task]` Modify the `startSpin` Zustand action:
        *   Remove the client-side mock result generation.
        *   After setting `isSpinning=true` and clearing previous win state, call `ApiService.requestSpin(currentBetInfo)`.
        *   Implement handling for the Promise returned by `ApiService`:
            *   **On Success (`SpinResult` received):** Update the Zustand store with `reelResults`, `winningLinesInfo`, `lastTotalWin`, `balance` from the **server response**. Let the existing reactive components handle the presentation.
            *   **On Failure:** Set the global error state and reset `isSpinning = false`.
    *   `[Task]` Ensure the `targetStopSymbols` state (or equivalent mechanism driving reel stops) is now set based *only* on the `reelResults` received from the server.
4.  **Refine Reel Stopping Logic (`engine-core`):**
    *   `[Task]` Verify that the `StandardReelStrip` animation logic correctly calculates the stop position based on the `reelResults` from the server (received via state update) rather than any previous mock data.
5.  **Backend Collaboration & Testing:**
    *   `[Task]` Collaborate with the backend team to finalize the minimal API contract for `/initialize` and `/spin` (request/response formats).
    *   `[Task]` Test the client integration against a running instance of the minimal `game-server`.
    *   `[Task]` Verify session initialization sets the correct balance.
    *   `[Task]` Verify clicking Spin sends a request, receives a response, and updates client state (balance, reels, win display) accurately based *only* on the server response.
    *   `[Task]` Test basic error handling (e.g., server unavailable, server returns error code).

**Definition of Done:**
*   `ApiService` is implemented with methods for session init and requesting a spin.
*   Client initializes its state based on a response from the `game-server`.
*   Spin action calls `ApiService.requestSpin` and updates Zustand store based *only* on the server's `SpinResult` response.
*   Reel animations stop correctly based on server-provided results.
*   Win presentation accurately reflects server-provided win data.
*   Client successfully communicates with the minimal `game-server` for the standard spin loop.
*   Relevant unit tests for `ApiService` and updated Zustand actions pass.

**Tracking:**
*   Create tickets for each `[Task]` for both client and corresponding minimal server implementation.
*   Track progress, facilitate client-server communication/collaboration.
*   Hold phase gate review: Demonstrate the server-driven spin loop. Confirm successful integration before proceeding to the First Game MVP (Phase 6).
