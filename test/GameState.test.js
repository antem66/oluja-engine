import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state, initGameState, updateState } from '../src/core/GameState.js';
import { AUTOPLAY_SPINS_DEFAULT, BET_PER_LINE_LEVELS, NUM_REELS, DEFAULT_CURRENCY } from '../src/config/gameSettings.js';
import { NUM_PAYLINES } from '../src/config/paylines.js';

// Mock dependencies
const mockEventBus = {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    listeners: vi.fn(() => ({})),
};
const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    config: { level: 'info', domains: {} },
    loadConfig: vi.fn(),
    _log: vi.fn(),
};

// Helper to get expected initial state
const getExpectedInitialState = () => ({
    balance: 10000,
    currentBetPerLine: BET_PER_LINE_LEVELS[3] || 0.1,
    currentTotalBet: (BET_PER_LINE_LEVELS[3] || 0.1) * NUM_PAYLINES,
    currentCurrency: DEFAULT_CURRENCY,
    numReels: NUM_REELS,
    lastTotalWin: 0,
    winningLinesInfo: [],
    isSpinning: false,
    isTransitioning: false,
    targetStoppingReelIndex: -1,
    isAutoplaying: false,
    autoplaySpinsRemaining: 0,
    autoplaySpinsDefault: AUTOPLAY_SPINS_DEFAULT,
    isTurboMode: false,
    isInFreeSpins: false,
    freeSpinsRemaining: 0,
    totalFreeSpinsWin: 0,
    isDebugMode: false,
    forceWin: false,
});

describe('GameState', () => {
    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
        // Restore any spied console methods
        vi.restoreAllMocks();
        // DO NOT initialize state here - let tests do it if needed
    });

    it('initGameState should set the state to default values', () => {
        // Initialize for this test
        initGameState({ eventBus: mockEventBus, logger: mockLogger });
        // Call init again to ensure reset logic works even if called multiple times
        initGameState({ eventBus: mockEventBus, logger: mockLogger });
        expect(state).toEqual(getExpectedInitialState());
    });

    it('initGameState should log an info message', () => {
        // Initialize for this test
        initGameState({ eventBus: mockEventBus, logger: mockLogger });
        expect(mockLogger.info).toHaveBeenCalledWith('GameState', 'Initialized and dependencies set.', expect.any(Object));
    });

    it('initGameState should log an error if dependencies are missing', () => { // Simplified test
        // Spy on console.error specifically for this test
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // @ts-ignore - Intentionally passing invalid args
        initGameState({}); // Missing eventBus and logger

        // Check if console.error was called
        expect(consoleErrorSpy).toHaveBeenCalledWith('GameState Error: initGameState requires dependencies object with eventBus and logger.');
        expect(consoleErrorSpy).toHaveBeenCalledWith('GameState', 'Initialization failed: Missing dependencies.');

        // Clean up the error spy
        consoleErrorSpy.mockRestore();
    });

    it('updateState should update the state object (after init)', () => {
        // Initialize for this test
        initGameState({ eventBus: mockEventBus, logger: mockLogger });
        vi.clearAllMocks(); // Clear init logs

        updateState({ balance: 5000, isSpinning: true });
        expect(state.balance).toBe(5000);
        expect(state.isSpinning).toBe(true);
    });

    it('updateState should emit a specific event for each changed property (after init)', () => {
        // Initialize for this test
        initGameState({ eventBus: mockEventBus, logger: mockLogger });
        const oldBalance = state.balance; // Get state *after* init
        const oldSpinning = state.isSpinning;
        vi.clearAllMocks(); // Clear init logs
        
        const newBalance = 5000;
        const newSpinning = true;

        updateState({ balance: newBalance, isSpinning: newSpinning });

        expect(mockEventBus.emit).toHaveBeenCalledTimes(2);
        expect(mockEventBus.emit).toHaveBeenCalledWith('state:changed:balance', {
            property: 'balance',
            oldValue: oldBalance,
            newValue: newBalance,
        });
        expect(mockEventBus.emit).toHaveBeenCalledWith('state:changed:isSpinning', {
            property: 'isSpinning',
            oldValue: oldSpinning,
            newValue: newSpinning,
        });
    });

    it('updateState should NOT emit an event if the value does not change (after init)', () => {
        // Initialize for this test
        initGameState({ eventBus: mockEventBus, logger: mockLogger });
        const currentBalance = state.balance;
        vi.clearAllMocks(); // Clear init logs
        
        updateState({ balance: currentBalance }); // Update with the same value
        expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('updateState should log a debug message for each changed property (after init)', () => {
        // Initialize for this test
        initGameState({ eventBus: mockEventBus, logger: mockLogger });
        const oldBalance = state.balance;
        vi.clearAllMocks(); // Clear init logs

        const newBalance = 5000;
        updateState({ balance: newBalance });

        expect(mockLogger.debug).toHaveBeenCalledTimes(1);
        expect(mockLogger.debug).toHaveBeenCalledWith('GameState', `State changing: balance from ${JSON.stringify(oldBalance)} to ${JSON.stringify(newBalance)}`);
    });

    it('updateState should NOT log a debug message if the value does not change (after init)', () => {
         // Initialize for this test
        initGameState({ eventBus: mockEventBus, logger: mockLogger });
        vi.clearAllMocks(); // Clear init logs

        updateState({ balance: state.balance });
        expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('updateState should log a warning and not emit/log if called before init', async () => { // Added async
        // Ensure a completely fresh module state for this test
        vi.resetModules();
        // Re-import updateState after resetting modules
        const { updateState: localUpdateState } = await import('../src/core/GameState.js');

        // Spy on console.warn specifically for this test
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // DO NOT Initialize here

        // Now call the locally imported updateState
        localUpdateState({ balance: 12345 });

        // Expect console.warn because deps are null in the fresh module
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        expect(consoleWarnSpy).toHaveBeenCalledWith('GameState: updateState called before initGameState or dependencies not set. Events and logging will be skipped.');
        
        // Re-import the state *after* the update to check its value
        const { state: finalState } = await import('../src/core/GameState.js');
        expect(finalState.balance).toBe(12345);

        // Clean up the spy
        consoleWarnSpy.mockRestore();
    });
});
