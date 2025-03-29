import { Game } from './core/Game.js';
import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin'; // Import PixiPlugin

// Import core services (assuming they export singletons for now)
import { globalEventBus } from './utils/EventBus.js';
import { featureManager } from './utils/FeatureManager.js';
import { logger } from './utils/Logger.js';
import { apiService } from './core/ApiService.js';

// Register GSAP PixiPlugin
gsap.registerPlugin(PixiPlugin);

// --- Entry Point ---

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => { // Make async for game init
    // ID of the container element in index.html where the Pixi canvas will be added
    const gameContainerId = 'game-container'; // Make sure this ID exists in index.html

    try {
        // Instantiate dependencies (or reference singletons)
        // In a more complex DI setup, a container would handle this
        const dependencies = {
            eventBus: globalEventBus,
            featureManager: featureManager,
            logger: logger,
            apiService: apiService,
            // Add other core services here as needed for injection
        };
        
        // Initialize core services that need it (if any)
        // Example: await apiService.init({ /* config */ });
        // Example: featureManager.loadFlags({ /* initial flags */ });
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
