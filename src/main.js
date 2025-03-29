import { Game } from './core/Game.js';
import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin'; // Import PixiPlugin

// Import core service singletons (or base classes)
import { globalEventBus } from './utils/EventBus.js';
import { featureManager } from './utils/FeatureManager.js';
import { logger } from './utils/Logger.js';
// Import the ApiService CLASS, not the (removed) singleton instance
import { ApiService } from './core/ApiService.js'; 

// Register GSAP PixiPlugin
gsap.registerPlugin(PixiPlugin);

// --- Entry Point ---

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => { // Make async for game init
    // ID of the container element in index.html where the Pixi canvas will be added
    const gameContainerId = 'game-container'; // Make sure this ID exists in index.html

    try {
        // Instantiate dependencies (or reference singletons)
        const eventBus = globalEventBus;
        // const featureManager = featureManager; // Already imported
        // const logger = logger; // Already imported
        
        // Instantiate ApiService, passing its dependencies
        const apiServiceInstance = new ApiService({ 
            logger: logger, 
            eventBus: eventBus, 
            featureManager: featureManager 
        });
        // TODO: Call apiServiceInstance.init() if/when needed

        const dependencies = {
            eventBus: eventBus,
            featureManager: featureManager,
            logger: logger,
            apiService: apiServiceInstance, // Pass the INSTANCE
        };
        
        logger.info('main', 'Core services instantiated/referenced.');

        // Create and initialize the game instance, passing dependencies
        const game = new Game(gameContainerId, dependencies);
        await game.init(); // Wait for game initialization to complete
        
        logger.info('main', 'Game initialized successfully.');

    } catch (err) {
        console.error("Failed to initialize game:", err); // Use console here as logger might not be reliable if init failed
        // Optionally display an error message to the user in the DOM
        const container = document.getElementById(gameContainerId);
        if (container) {
            container.innerHTML = `<p style="color: red; text-align: center; margin-top: 50px;">Error loading game. Please check console.</p>`;
        }
    }
});
