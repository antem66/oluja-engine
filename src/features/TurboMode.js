import { skipBounceInTurbo } from '../config/animationSettings.js';
// Removed GameState import
// Removed UIManager import

// Import types
import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';
import { FeatureManager } from '../utils/FeatureManager.js';

// --- Module-level variables ---
/** @type {Logger | null} */
let logger = null;
/** @type {EventBus | null} */
let eventBus = null;
/** @type {FeatureManager | null} */
let featureManager = null;

// Removed reelsRef

/**
 * Initializes the TurboMode module with dependencies.
 * @param {object} dependencies
 * @param {Logger} dependencies.logger
 * @param {EventBus} dependencies.eventBus
 * @param {FeatureManager} dependencies.featureManager
 */
export function initTurboMode(dependencies) {
    if (!dependencies || !dependencies.logger || !dependencies.eventBus || !dependencies.featureManager) {
        console.error("TurboMode Init Error: Missing dependencies (logger, eventBus, featureManager).");
        return;
    }
    logger = dependencies.logger;
    eventBus = dependencies.eventBus;
    featureManager = dependencies.featureManager;

    logger.info('TurboMode', 'Initialized.');
    // No event listeners needed here currently, as UI updates react to GameState changes
}

/**
 * Applies turbo settings to the game.
 * Currently, this primarily involves logging, as actual speed changes are handled elsewhere
 * based on reading `state.isTurboMode` when needed (e.g., spin duration calculation).
 * @param {boolean} isTurbo - Whether turbo mode is currently active.
 */
export function applyTurboSettings(isTurbo) {
    // Logic for directly modifying reel properties (like skipBounce) removed.
    // Spin duration/speed logic in Game.js or SpinManager should read state.isTurboMode.
    // UI updates are handled by UIManager reacting to state:changed:isTurboMode events.
    logger?.info('TurboMode', `applyTurboSettings called with isTurbo: ${isTurbo}.`);
}

// Optional: Add destroy function if needed later for cleanup
export function destroy() {
    logger?.info('TurboMode', 'Destroyed.');
    logger = null;
    eventBus = null;
    featureManager = null;
}
