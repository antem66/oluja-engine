# Oluja Engine: Spin Request & Result Handling Flow

**Last Updated:** March 30, 2024

## 1. Overview

This document describes the sequence of events and module interactions that occur from the moment the player initiates a spin until the final results are processed and displayed. This flow relies heavily on the `EventBus` for decoupled communication and the `ApiService` acting as the gateway for spin outcomes (currently mocked).

## 2. Sequence Diagram / Flow

```mermaid
sequenceDiagram
    participant Player
    participant DebugPanel
    participant Button (UI)
    participant UIManager
    participant SpinManager
    participant GameState
    participant ApiService
    participant ResultHandler
    participant ReelManager
    participant PaylineGraphics
    participant AnimationController
    participant Animations
    participant EventBus

    alt Debug Force Win
        Player->>DebugPanel: Clicks "Force X Win"
        DebugPanel->>EventBus: emit('debug:forceWinLevel', {level})
        EventBus->>ApiService: _handleForceWinLevel()
        ApiService->>ApiService: Stores _forcedWinLevel
    end

    Player->>Button (UI): Clicks Spin Button
    Button (UI)->>UIManager: onClick Handler
    UIManager->>EventBus: emit('ui:button:click', {buttonName: 'spin'})

    EventBus->>SpinManager: handleSpinRequest()
    SpinManager->>SpinManager: startVisualSpin()
    SpinManager->>EventBus: emit('spin:interruptAnimations')
    EventBus->>UIManager: _handleInterruptAnimations()
    SpinManager->>EventBus: emit('paylines:clearRequest')
    EventBus->>PaylineGraphics: _clearLines()
    SpinManager->>GameState: updateState({isSpinning: true, lastTotalWin: 0, balance: ...}) ; Deducts bet if not Free Spin
    GameState->>EventBus: emit('game:stateChanged', ...)
    EventBus->>UIManager: _handleStateChange() ; Updates displays, disables buttons
    EventBus->>Plugins: _handleStateChange() (e.g., Autoplay, FreeSpins)
    SpinManager->>EventBus: emit('spin:started')
    SpinManager->>ReelManager: Calls reel.startSpinning() for each reel
    SpinManager->>ApiService: requestSpin({totalBet})
    
    alt Use Mock API
        ApiService->>ApiService: _generateMockSpinResultData()
        Note over ApiService: Checks _forcedWinLevel, calculates win, stopPositions etc.
        ApiService->>EventBus: emit('server:spinResultReceived', {data: resultData})
    else Real API Call
        ApiService->>Backend: fetch('/api/v1/spin', ...)
        alt Success
            Backend-->>ApiService: Response OK (JSON resultData)
            ApiService->>EventBus: emit('server:spinResultReceived', {data: resultData})
        else Failure
            Backend-->>ApiService: Response Error
            ApiService->>EventBus: emit('server:error', {type: 'ApiError', ...})
        end
    end

    EventBus->>ResultHandler: _handleSpinResultReceived({data})
    ResultHandler->>ReelManager: Sets reel.finalStopPosition for each reel
    ResultHandler->>ReelManager: Calls reel.scheduleStop(targetTime) for each reel
    EventBus->>SpinManager: (Indirectly, via previous emit)

    Note over ReelManager, Game: Reels spin visually, update loop runs...

    Game->>ReelManager: update() -> returns false when all reels stopped
    Game->>SpinManager: handleSpinEnd()
    SpinManager->>GameState: updateState({isSpinning: false})
    GameState->>EventBus: emit('game:stateChanged', ...)
    EventBus->>UIManager: _handleStateChange() ; Re-enables buttons
    EventBus->>Plugins: _handleStateChange()
    SpinManager->>EventBus: emit('reels:stopped')
    EventBus->>Plugins: Handle reels:stopped (e.g., Autoplay)
    SpinManager->>EventBus: emit('spin:evaluateRequest', {spinResultData})

    EventBus->>ResultHandler: _processSpinResult({spinResultData})
    ResultHandler->>GameState: updateState({balance: ..., lastTotalWin: ..., winningLinesInfo: ...})
    GameState->>EventBus: emit('game:stateChanged', ...)
    EventBus->>UIManager: _handleStateChange() ; Balance update starts rolling
    EventBus->>Plugins: _handleStateChange()
    ResultHandler->>EventBus: emit('paylines:show', {winningLines})
    EventBus->>PaylineGraphics: _drawLines()
    ResultHandler->>EventBus: emit('win:validatedForAnimation', payload)
    EventBus->>AnimationController: _handleWinValidated(payload)
    AnimationController->>AnimationController: playAnimation('symbolWin', ...)
    AnimationController->>AnimationController: playAnimation('winRollup', ...)
    AnimationController->>AnimationController: playAnimation('bigWinText', ...)
    AnimationController->>AnimationController: playAnimation('particleBurst', ...)
    AnimationController->>Animations: animateWinningSymbols()
    AnimationController->>UIManager: animateWin()
    AnimationController->>Animations: _playBigWinText()
    AnimationController->>Animations: createParticles()
    ResultHandler->>EventBus: emit('win:evaluationComplete')
    EventBus->>Plugins: Handle win:evaluationComplete (e.g., FreeSpins)
    
    Note over AnimationController: Waits for animations (symbolWin, winRollup, bigWinText) via Promise.all
    AnimationController->>EventBus: emit('win:sequenceComplete')
    Note over Plugins: Plugins might listen for win:sequenceComplete to proceed (e.g., Autoplay next spin)

```

## 3. Key Module Responsibilities in the Flow

*   **UIManager:** Handles raw button clicks, emits `ui:button:click`. Reacts to `game:stateChanged` to update text displays and button enabled states. Executes win rollup animation (`animateWin`) when triggered by `AnimationController`.
*   **SpinManager:** Listens for `ui:button:click` (spin). Initiates the visual spin process (`startVisualSpin`), triggers `ApiService.requestSpin`. Handles the end of the visual spin (`handleSpinEnd`) detected by `Game.js`, emitting `reels:stopped` and `spin:evaluateRequest`.
*   **ApiService:** Receives spin requests. Either generates a mock result (`_generateMockSpinResultData`) or performs a real API call. Emits `server:spinResultReceived` with the outcome data or `server:error`.
*   **ResultHandler:** Listens for `server:spinResultReceived`, sets stop positions and schedules stops on the `ReelManager`/`Reels`. Listens for `spin:evaluateRequest`, processes the result data (updates balance state, emits events for `PaylineGraphics` and `AnimationController`).
*   **ReelManager / Reel:** Manages the visual spinning and stopping based on instructions (`startSpinning`, `setFinalStopPosition`, `scheduleStop`) and the internal state machine driven by the ticker and GSAP tweens.
*   **PaylineGraphics:** Listens for `paylines:show`, draws/animates lines based on payload. Listens for `paylines:clearRequest` to clear lines.
*   **AnimationController:** Listens for `win:validatedForAnimation`. Triggers registered animation functions (`symbolWin`, `winRollup`, `bigWinText`, `particleBurst`) based on the event data. Waits for critical animations and emits `win:sequenceComplete`.
*   **Animations:** Provides the *logic* for symbol animations, big win text, and particles. This logic is *registered* with `AnimationController` and executed when the controller calls `playAnimation`.
*   **GameState:** Stores the central state. Modified via `updateState`. Emits `game:stateChanged`.
*   **EventBus:** Facilitates all decoupled communication between modules.
*   **Plugins (e.g., Autoplay, FreeSpins):** Listen for various events (`reels:stopped`, `win:evaluationComplete`, `game:stateChanged`, `win:sequenceComplete`) to implement their specific logic (e.g., trigger next spin, check for FS trigger).

## 4. Importance of `ApiService`

`ApiService` is the gatekeeper for spin results. Whether using the internal mock or a real backend, all subsequent logic (reel stopping, win calculation/display, feature triggers) **must** flow from the data emitted in the `server:spinResultReceived` event. This ensures the architecture is ready for server authority.
