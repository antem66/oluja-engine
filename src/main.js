import './styles/main.css';
import { Game } from './core/Game.js';
import { logger } from './utils/Logger.js'; // Assuming logger is configured here
import { globalEventBus } from './utils/EventBus.js'; // Global event bus
import { ApiService } from './core/ApiService.js';
import { featureManager } from './utils/FeatureManager.js'; // Feature manager
import { initGameState, destroyGameState } from './core/GameState.js';
import initialState from './config/initialState.js'; // <-- Import the defined initial state

// --- BEGIN EDIT: Add GSAP PixiPlugin Registration ---
import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin';
import * as PIXI from 'pixi.js'; // Import PIXI namespace

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI); // Link PixiPlugin to the PIXI instance
logger?.info('main', 'GSAP PixiPlugin registered.');
// --- END EDIT ---

// Simple loading indicator (can be enhanced)
const loadingElement = document.getElementById('loading');
if (loadingElement) loadingElement.style.display = 'flex'; // Show loading

// --- Entry Point ---

let gameInstance = null; // Store game instance for cleanup

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    logger.info('main', 'DOM Content Loaded.');

    try {
        // Initialize core services and state
        initGameState({ 
            eventBus: globalEventBus, 
            logger: logger, 
            initialState: initialState // <-- Pass initialState here
        });
        
        // Instantiate ApiService
        const apiServiceInstance = new ApiService({ eventBus: globalEventBus, logger: logger, featureManager: featureManager });
        
        // Prepare dependencies for Game instance
        const gameDependencies = {
            logger,
            eventBus: globalEventBus,
            apiService: apiServiceInstance, // Pass the instance
            featureManager,
            initialState: initialState // <-- Use the imported initial state
        };

        logger.info('main', 'Creating Game instance...');
        gameInstance = new Game('game-canvas-container', gameDependencies);

        logger.info('main', 'Initializing Game...');
        await gameInstance.init();

        // Hide loading indicator once game is ready
        if (loadingElement) loadingElement.style.display = 'none';

        // Handle cleanup on window unload
        window.addEventListener('beforeunload', () => {
            logger.info('main', 'Cleaning up game before unload...');
            gameInstance.destroy();
            destroyGameState(); // Destroy state
        });

    } catch (err) {
        console.error("Failed to initialize game:", err); // Use console here as logger might not be reliable if init failed
        // Optionally display an error message to the user in the DOM
        const container = document.getElementById('game-canvas-container');
        if (container) {
            container.innerHTML = `<p style="color: red; text-align: center; margin-top: 50px;">Error loading game. Please check console.</p>`;
        }
    }
});
