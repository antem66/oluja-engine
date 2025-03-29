import { Game } from './core/Game.js';
import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin'; // Import PixiPlugin

// Import core service singletons (or base classes)
import { globalEventBus } from './utils/EventBus.js';
import { featureManager } from './utils/FeatureManager.js';
import { logger } from './utils/Logger.js';
// Import the ApiService CLASS, not the (removed) singleton instance
import { ApiService } from './core/ApiService.js'; 
import { initGameState, destroyGameState } from './core/GameState.js'; // Import GameState init/destroy

// Register GSAP PixiPlugin
gsap.registerPlugin(PixiPlugin);

// --- Entry Point ---

let gameInstance = null; // Store game instance for cleanup

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => { // Make async for game init
    // ID of the container element in index.html where the Pixi canvas will be added
    const gameContainerId = 'game-container'; // Make sure this ID exists in index.html

    try {
        // Use core service singletons
        const eventBus = globalEventBus;
        // Remove invalid lines:
        // const logger = logger; 
        // const featureManager = featureManager; 
        
        // Initialize GameState immediately and get initial state
        const initialState = initGameState({ eventBus, logger }); // Capture initial state
        
        // Instantiate ApiService
        const apiServiceInstance = new ApiService({ logger, eventBus, featureManager });
        
        // Prepare Dependencies object for Game (core services + initial state)
        const dependencies = {
            logger,
            eventBus,
            featureManager,
            apiService: apiServiceInstance,
            initialState: initialState // Add initial state
        };

        // Create and Initialize Game
        gameInstance = new Game(gameContainerId, dependencies); // Store instance
        await gameInstance.init();
        logger.info('main', 'Game initialization complete.');
        
    } catch (err) {
        console.error("Failed to initialize game:", err); // Use console here as logger might not be reliable if init failed
        // Optionally display an error message to the user in the DOM
        const container = document.getElementById(gameContainerId);
        if (container) {
            container.innerHTML = `<p style="color: red; text-align: center; margin-top: 50px;">Error loading game. Please check console.</p>`;
        }
    }
});

// Cleanup listener
window.addEventListener('beforeunload', () => {
    logger?.info('main', 'beforeunload event triggered, cleaning up game...');
    if (gameInstance) {
        gameInstance.destroy();
        gameInstance = null;
    }
    // Destroy GameState after game instance
    destroyGameState(); 
});
