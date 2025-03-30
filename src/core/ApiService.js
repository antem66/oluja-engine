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

    /** @type {Function | null} */
    _unsubscribeForceWinLevel = null; // Add listener for debug force win level

    /** @type {'big' | 'mega' | 'epic' | null} */
    _forcedWinLevel = null; // Store the requested forced win level

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

        // Listen for debug force win level requests
        if (this.eventBus) {
            this._unsubscribeForceWinLevel = this.eventBus.on('debug:forceWinLevel', this._handleForceWinLevel.bind(this));
            this.logger?.info('ApiService', 'Successfully subscribed to debug:forceWinLevel event.');
        } else {
            this.logger?.error('ApiService', 'EventBus missing, cannot subscribe to debug:forceWinLevel.');
            this._unsubscribeForceWinLevel = null;
        }
    }

    /**
     * Handles the debug:forceWinLevel event.
     * @param {object} event 
     * @private
     */
    _handleForceWinLevel(event) {
        const level = event?.level;
        // Add log INSIDE the handler
        if (level === 'big' || level === 'mega' || level === 'epic') {
            this.logger?.info('ApiService', `Received debug request to force a '${level}' win on next mock spin.`);
            this._forcedWinLevel = level;
        } else {
            this.logger?.warn('ApiService', 'Received invalid level for debug:forceWinLevel', event);
            this._forcedWinLevel = null; // Clear any previous force request
        }
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
            // Simulate async delay
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100)); 

            // Generate the mock result based on current state (e.g., bet)
            // In a real scenario, betInfo would be sent to the server
            const mockResultData = this._generateMockSpinResultData(state.currentBetPerLine); 

            if (mockResultData) {
                this.logger.debug('ApiService', 'Generated Mock Spin Result Data:', mockResultData);
                this.eventBus?.emit('server:spinResultReceived', { data: mockResultData });
            } else {
                // Handle error case where mock generation failed
                 this.eventBus?.emit('server:error', { type: 'MockGenerationError', message: 'Failed to generate mock result data' });
            }        
        } else {
            // --- Phase 5: Implement actual backend API call --- 
            this.logger.warn('ApiService', 'Real API call initiated...');
            try {
                // TODO: Get endpoint URL and Auth Token from this.config
                const endpoint = '/api/v1/spin'; // Placeholder
                const authToken = 'Bearer PLACEHOLDER_TOKEN'; // Placeholder

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authToken 
                    },
                    body: JSON.stringify(betInfo), // Send bet info from SpinManager
                });

                if (!response.ok) {
                     // Attempt to parse error message from server if possible
                     let errorData = { message: `API Error: ${response.status} ${response.statusText}` };
                     try { 
                         errorData = await response.json(); 
                     } catch (parseError) { /* Ignore if body isn't JSON */ }
                    throw new Error(errorData.message || `API Error: ${response.status}`);
                }

                const resultData = await response.json();
                this.logger.info('ApiService', 'Received successful API response:', resultData);
                // TODO: Validate resultData structure matches expected API response
                this.eventBus?.emit('server:spinResultReceived', { data: resultData });

            } catch (error) {
                this.logger.error('ApiService', 'API requestSpin failed:', error);
                this.eventBus?.emit('server:error', { 
                    type: 'ApiError', 
                    message: error.message || 'Spin request failed due to network or server error.', 
                    details: error 
                });
            }
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
    _generateMockSpinResultData(currentBetPerLine) {
        // this.logger?.debug('ApiService', '_generateMockSpinResultData called', { currentBetPerLine, forcedLevel: this._forcedWinLevel }); // Removed debug log
        // Use GameState directly for this debug flag, as FeatureManager isn't dynamically updated
        const forceWin = state.forceWin;
        // this.logger?.debug('ApiService', `Force Win flag is currently: ${forceWin}`); // Removed debug log

        const stopPositions = [];
        const mockSymbolGrid = []; // Need grid temporarily for win calculation
        const symbolsToAnimate = new Set(); // Use a Set to avoid duplicates

        // 1. Determine Stop Positions (Random or Forced based on debug flag)
        // Basic random stop generation (similar to old client logic)
        for (let i = 0; i < NUM_REELS; i++) {
            const strip = REEL_STRIPS[i];
            if (!strip) {
                throw new Error(`Reel strip not found for reel index ${i}`);
            }

            let stopIndex;
            if (forceWin && i < 3) { // Force first 3 reels to match for a simple win
                // Find the first occurrence of a high-value symbol (e.g., FACE1) on strip[i]
                // and set stopIndex to show it on the middle row (index 1)
                const targetSymbol = 'FACE1'; // Or pick randomly from high-value symbols
                const symbolIndexOnStrip = strip.indexOf(targetSymbol);
                if (symbolIndexOnStrip !== -1) {
                    // Calculate stop index to place targetSymbol at visible row 1
                    stopIndex = (symbolIndexOnStrip - 1 + strip.length) % strip.length;
                    this.logger?.debug('ApiService', `Forcing win: Reel ${i} stop index for ${targetSymbol} at row 1 is ${stopIndex}`);
                } else {
                    this.logger?.warn('ApiService', `Could not find ${targetSymbol} on reel ${i} for forced win, using random.`);
                    stopIndex = Math.floor(Math.random() * strip.length); // Fallback
                }
            } else {
                 // Not forcing win or for reels beyond the forced match
                 stopIndex = Math.floor(Math.random() * strip.length);
            }
            
            stopPositions.push(stopIndex);

            // Build the visible symbol grid based on stops
            const column = [];
            for (let j = 0; j < SYMBOLS_PER_REEL_VISIBLE; j++) {
                const symbolIndex = (stopIndex + j + strip.length) % strip.length;
                column.push(strip[symbolIndex]);
            }
            mockSymbolGrid.push(column);
        }
        
        // 2. Calculate Wins Based on Stops (Client-side calculation for the mock)
        let calculatedTotalWin = 0;
        const calculatedWinningLines = [];

        // Simplified win calculation based on the generated grid (from WinEvaluation logic)
        PAYLINES.forEach((linePath, lineIndex) => {
            const firstSymbolId = mockSymbolGrid[0]?.[linePath[0]];
            if (!firstSymbolId || !PAYTABLE[firstSymbolId]) return;

            let matchCount = 1;
            for (let reelIdx = 1; reelIdx < NUM_REELS; reelIdx++) {
                const symbolId = mockSymbolGrid[reelIdx]?.[linePath[reelIdx]];
                if (symbolId === firstSymbolId) {
                    matchCount++;
                } else {
                    break;
                }
            }

            const payoutInfo = PAYTABLE[firstSymbolId];
            const expectedPayout = payoutInfo ? payoutInfo[matchCount] : undefined;

            if (matchCount >= 3 && expectedPayout !== undefined) {
                const lineWin = expectedPayout * currentBetPerLine; // Use passed bet
                calculatedTotalWin += lineWin;
                calculatedWinningLines.push({
                    lineIndex: lineIndex,
                    symbolId: firstSymbolId,
                    count: matchCount,
                    winAmount: lineWin,
                });

                // Add winning symbols to the set
                for (let reelIdx = 0; reelIdx < matchCount; reelIdx++) {
                    const symbolId = mockSymbolGrid[reelIdx]?.[linePath[reelIdx]];
                    // We need a way to identify the actual PIXI.Sprite instance later.
                    // For now, let's store reel/row info. Presentation layer will map this.
                    // TODO: Refine this identification method. Store PIXI object IDs? Pass sprites directly?
                    symbolsToAnimate.add({ reelIndex: reelIdx, rowIndex: linePath[reelIdx], symbolId: symbolId });
                }
            }
        });
        
        // 3. Calculate Mock New Balance (Server *would* send this)
        // Note: Accessing state here is still needed for the STARTING balance in the mock calculation.
        // A real server wouldn't need client state.
        const mockNewBalance = state.balance - currentBetPerLine * PAYLINES.length + calculatedTotalWin;

        // 4. Simulate Feature Triggers (e.g., Free Spins)
        let scatterCount = 0;
        mockSymbolGrid.forEach(col => col.forEach(symId => {
            if (symId === SCATTER_SYMBOL_ID) scatterCount++;
        }));
        // Structure matches proposed API
        const featuresTriggered = {
             freeSpinsAwarded: scatterCount >= 3 ? 10 : 0 // Example: award 10 if 3+ scatters
        }

        // 5. Construct Payload (matching proposed API structure)
        let adjustedWinAmount = calculatedTotalWin;
        if (this._forcedWinLevel) {
            let multiplier = 0;
            switch (this._forcedWinLevel) {
                case 'big': multiplier = 20; break; // Comfortably above 15
                case 'mega': multiplier = 50; break; // Comfortably above 40
                case 'epic': multiplier = 80; break; // Comfortably above 75
            }
            // Calculate win based on total bet
            const totalBet = currentBetPerLine * PAYLINES.length;
            adjustedWinAmount = totalBet * multiplier;
            // this.logger?.info('ApiService', `Forcing ${this._forcedWinLevel} win amount: ${adjustedWinAmount.toFixed(2)} (Multiplier: ${multiplier}, TotalBet: ${totalBet})`); // Removed info log
            // IMPORTANT: Reset the forced level after using it once
            this._forcedWinLevel = null;
            // Ensure winningLines and symbolsToAnimate are populated if forcing a win from 0
            if (calculatedWinningLines.length === 0 && adjustedWinAmount > 0) {
                 // Need to generate a plausible winning line for the forced amount
                 // For simplicity, just force a 3-symbol win on line 0 with FACE1
                 const forcedLine = { lineIndex: 0, symbolId: 'FACE1', count: 3, winAmount: adjustedWinAmount /* Crude approximation */ };
                 calculatedWinningLines.push(forcedLine);
                 // Add corresponding symbols to animate
                 const linePath = PAYLINES[0];
                 for(let r=0; r<3; r++) {
                     symbolsToAnimate.add({ reelIndex: r, rowIndex: linePath[r], symbolId: 'FACE1' });
                 }
            }
        }
        // Adjust balance based on potentially forced win
        const adjustedNewBalance = state.balance - (currentBetPerLine * PAYLINES.length) + adjustedWinAmount;

        const result = {
            stopPositions: stopPositions,
            winningLines: calculatedWinningLines,
            totalWin: adjustedWinAmount,
            newBalance: adjustedNewBalance,
            scatterCount: scatterCount,
            symbolsToAnimate: Array.from(symbolsToAnimate),
            featuresTriggered: featuresTriggered,
        };

        return result;
    }

    destroy() {
        this.logger?.info('ApiService', 'Destroying...');
        // Unsubscribe debug listener
        if (this._unsubscribeForceWinLevel) {
            this._unsubscribeForceWinLevel();
            this._unsubscribeForceWinLevel = null;
        }
        this.eventBus = null;
        this.featureManager = null;
        this.logger = null;
    }
}

// Remove singleton export
// export const apiService = new ApiService();
