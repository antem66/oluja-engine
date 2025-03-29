/**
 * @module ApiService
 * @description Handles all communication with the backend game server.
 * For initial development and testing, it can provide mocked responses.
 * Instantiated in main.js and injected into Game.
 * 
 * Public API:
 * - constructor(dependencies): Initializes with core dependencies.
 * - init(config): Initializes the service with game/server config.
 * - requestSpin(betInfo): Sends a spin request to the server or generates a mock result, emitting events.
 * - requestGameState(): Fetches the current game state from the server (TODO).
 * 
 * Events Emitted:
 * - server:spinResultReceived {data: SpinResult}
 * - server:error {type: string, message: string, details?: any}
 * - server:gameStateReceived {state: GameStateData} (TODO)
 * - server:balanceUpdated {newBalance: number}
 *
 * Events Consumed: (None currently planned)
 */

// Remove direct global imports for injected services
// import { globalEventBus } from '../utils/EventBus.js';
// import { featureManager } from '../utils/FeatureManager.js';
// import { logger } from '../utils/Logger.js';

// Keep temporary imports needed ONLY for mock generation logic
// TODO: Remove these when mock logic is fully self-contained or DI is deeper
import { state } from './GameState.js'; 
import { PAYTABLE } from '../config/symbolDefinitions.js';
import { PAYLINES } from '../config/paylines.js';
import { NUM_REELS, SYMBOLS_PER_REEL_VISIBLE, SCATTER_SYMBOL_ID } from '../config/gameSettings.js';
import { REEL_STRIPS } from '../config/reelStrips.js';
// Import types for JSDoc
import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';
import { FeatureManager } from '../utils/FeatureManager.js';

export class ApiService {
    /** @type {import('../utils/EventBus.js').EventBus | null} */
    eventBus = null; 
    /** @type {import('../utils/FeatureManager.js').FeatureManager | null} */
    featureManager = null;
    /** @type {import('../utils/Logger.js').Logger | null} */
    logger = null;
    config = {};
    initialized = false;

    /**
     * @param {object} dependencies - Core services dependencies.
     * @param {import('../utils/Logger.js').Logger} dependencies.logger
     * @param {import('../utils/EventBus.js').EventBus} dependencies.eventBus
     * @param {import('../utils/FeatureManager.js').FeatureManager} dependencies.featureManager
     */
    constructor(dependencies) {
        this.logger = dependencies.logger;
        this.eventBus = dependencies.eventBus;
        this.featureManager = dependencies.featureManager;

        // Basic validation
        if (!this.logger) console.error("ApiService: Logger dependency is missing!"); // Use console as logger might be null
        if (!this.eventBus) this.logger?.error('ApiService', 'EventBus dependency is missing!');
        if (!this.featureManager) this.logger?.error('ApiService', 'FeatureManager dependency is missing!');

        this.logger?.info('ApiService', 'Instance created.');
    }

    init(config = {}) {
        this.config = config;
        // TODO: Configure API endpoints, authentication tokens, etc.
        this.initialized = true;
        this.logger?.info('ApiService', 'Initialized.', this.config);
    }

    async requestSpin(betInfo) {
        // Use injected featureManager and logger
        if (!this.featureManager || !this.logger) {
            console.error('ApiService.requestSpin: Missing critical dependencies (featureManager or logger).');
            this.eventBus?.emit('server:error', { type: 'InternalError', message: 'ApiService dependencies missing.'});
            return;
        }

        const useMock = this.featureManager.isEnabled('debugUseMockApi');
        this.logger.debug('ApiService', `Requesting spin... Mock API: ${useMock}`, betInfo);

        if (useMock) {
            try {
                // Simulate async delay
                await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100)); 
                const mockResult = this._generateMockSpinResult();
                this.logger.debug('ApiService', 'Generated Mock Spin Result:', mockResult);
                // Use injected eventBus
                this.eventBus?.emit('server:spinResultReceived', { data: mockResult });
            } catch (error) {
                this.logger.error('ApiService', 'Error generating mock spin result:', error);
                // Use injected eventBus
                this.eventBus?.emit('server:error', { type: 'MockGenerationError', message: 'Failed to generate mock result', details: error });
            }
        } else {
            // --- TODO (Future Task 5.8): Implement actual backend API call --- 
            this.logger.warn('ApiService', 'Real API call not implemented yet!');
            // Example structure:
            // try {
            //   const response = await fetch(this.config.spinEndpoint, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json', /* ... auth headers ... */ },
            //     body: JSON.stringify(betInfo),
            //   });
            //   if (!response.ok) {
            //     throw new Error(`API Error: ${response.status} ${response.statusText}`);
            //   }
            //   const resultData = await response.json();
            //   this.eventBus.emit('server:spinResultReceived', { data: resultData });
            // } catch (error) {
            //   this.logger.error('ApiService', 'API requestSpin failed:', error);
            //   this.eventBus.emit('server:error', { type: 'ApiError', message: 'Spin request failed', details: error });
            // }
            // For now, emit an error or a default non-winning result
            this.eventBus?.emit('server:error', { type: 'NotImplemented', message: 'Real API spin request not implemented.' });
        }
    }

    async requestGameState() {
        // TODO: Implement fetching initial game state from server
        this.logger?.warn('ApiService', 'requestGameState not implemented yet.');
        // Simulate failure for now
        this.eventBus?.emit('server:error', { type: 'NotImplemented', message: 'requestGameState not implemented.' });
    }

    // --- Private --- 

    /**
     * Generates a mock spin result based on current client-side logic.
     * This encapsulates the outcome generation that will eventually live on the server.
     * Ensures the game functions during refactoring before real API is built.
     * TODO: Needs access to current game state (bet) and config (reels, paylines) -
     *       using temporary direct imports for now.
     * @returns {object} - Mock spin result matching expected server payload structure.
     */
    _generateMockSpinResult() {
        // Use injected featureManager
        const forceWin = this.featureManager?.isEnabled('debugForceWin') ?? false;
        const stopPositions = [];
        const finalSymbolGrid = [];

        // 1. Determine Stop Positions (Random or Forced)
        // Basic random stop generation (similar to old client logic)
        for (let i = 0; i < NUM_REELS; i++) {
            const strip = REEL_STRIPS[i];
            if (!strip) {
                throw new Error(`Reel strip not found for reel index ${i}`);
            }
            // TODO: Incorporate forced win logic here if needed for debug.forceWin
            // This requires more complex logic to guarantee a win based on PAYTABLE/PAYLINES
            // For now, just random stops.
            const stopIndex = Math.floor(Math.random() * strip.length);
            stopPositions.push(stopIndex);

            // Build the visible symbol grid based on stops
            const column = [];
            for (let j = 0; j < SYMBOLS_PER_REEL_VISIBLE; j++) {
                const symbolIndex = (stopIndex + j + strip.length) % strip.length;
                column.push(strip[symbolIndex]);
            }
            finalSymbolGrid.push(column);
        }
        
        // 2. Calculate Wins Based on Stops (Client-side calculation for the mock)
        let calculatedTotalWin = 0;
        const calculatedWinningLines = [];

        // Simplified win calculation based on the generated grid (from WinEvaluation logic)
        PAYLINES.forEach((linePath, lineIndex) => {
            const firstSymbolId = finalSymbolGrid[0]?.[linePath[0]];
            if (!firstSymbolId || !PAYTABLE[firstSymbolId]) return;

            let matchCount = 1;
            for (let reelIdx = 1; reelIdx < NUM_REELS; reelIdx++) {
                const symbolId = finalSymbolGrid[reelIdx]?.[linePath[reelIdx]];
                if (symbolId === firstSymbolId) {
                    matchCount++;
                } else {
                    break;
                }
            }

            const payoutInfo = PAYTABLE[firstSymbolId];
            const expectedPayout = payoutInfo ? payoutInfo[matchCount] : undefined;

            if (matchCount >= 3 && expectedPayout !== undefined) {
                const lineWin = expectedPayout * state.currentBetPerLine; // Using imported state temporarily
                calculatedTotalWin += lineWin;
                calculatedWinningLines.push({
                    lineIndex: lineIndex,
                    symbolId: firstSymbolId,
                    count: matchCount,
                    winAmount: lineWin,
                    // TODO: Add winning symbol positions/indices if needed by front-end?
                });
            }
        });
        
        // 3. Simulate Balance Update (Should eventually come directly from server)
        // This is a simplification for the mock.
        const finalBalance = state.balance - state.currentTotalBet + calculatedTotalWin;
        // Emit balance update event immediately after calculation for mock
        this.eventBus?.emit('server:balanceUpdated', { newBalance: finalBalance });

        // 4. Simulate Feature Triggers (e.g., Free Spins)
        let scatterCount = 0;
        finalSymbolGrid.forEach(col => col.forEach(symId => {
            if (symId === SCATTER_SYMBOL_ID) scatterCount++;
        }));
        const featureTriggers = [];
        if (scatterCount >= 3) { // Assuming 3+ scatters trigger free spins
             featureTriggers.push({ type: 'FreeSpins', count: 10 }); // Example trigger
        }

        // 5. Construct Payload (matching Task 1.8 definition)
        return {
            stopPositions: stopPositions, // Array of stop indices [reel0, reel1, ...]
            finalSymbolGrid: finalSymbolGrid, // Optional: Grid for easier validation? Or derive on client?
            winningLines: calculatedWinningLines, // Array of { lineIndex, symbolId, count, winAmount }
            totalWin: calculatedTotalWin,
            finalBalance: finalBalance,
            featureTriggers: featureTriggers, // Array of { type, ...data }
        };
    }
}

// Remove singleton export
// export const apiService = new ApiService();
