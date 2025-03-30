import './styles/main.css';
import * as PIXI from 'pixi.js';
import { Game } from './core/Game.js';
import { Logger } from './utils/Logger.js';
import { EventBus } from './utils/EventBus.js';
import { ApiService } from './core/ApiService.js';
import { FeatureManager } from './utils/FeatureManager.js';
import { initGameState, destroyGameState } from './core/GameState.js';
import { GAME_WIDTH, GAME_HEIGHT } from './config/gameSettings.js';
import initialState from './config/initialState.js'; // <-- Import the defined initial state
import { LoadingScreen } from './core/LoadingScreen.js';
import { ASSET_MANIFEST } from './config/assetManifest.js'; // Uncommented
import { AppInitializer } from './core/AppInitializer.js';

// --- BEGIN EDIT: Move Logger Instantiation Up ---
const logger = new Logger();
// --- END EDIT: Move Logger Instantiation Up ---

// --- BEGIN EDIT: Add GSAP PixiPlugin Registration ---
import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin';
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI); // Link PixiPlugin to the PIXI instance
logger.info('Main', 'GSAP PixiPlugin registered.'); // Use instantiated logger
// --- END EDIT ---

// Simple loading indicator (can be enhanced)
const loadingElement = document.getElementById('loading');
if (loadingElement) loadingElement.style.display = 'flex'; // Show loading

// --- Entry Point ---

let gameInstance = null; // Store game instance for cleanup

document.addEventListener('DOMContentLoaded', async () => {
    // Logger already instantiated above
    logger.info('DOM', 'Content Loaded.');

    // Constants
    const CANVAS_CONTAINER_ID = 'game-container';
    const STUDIO_LOGO_PATH = 'assets/images/ui/studio_logo.png'; // Confirm this path

    // Use an async IIFE (Immediately Invoked Function Expression) to handle top-level await
    (async () => {
        logger.info('Main', 'Starting application initialization...');

        try {
            // Create and run the AppInitializer
            const initializer = new AppInitializer(CANVAS_CONTAINER_ID, ASSET_MANIFEST, STUDIO_LOGO_PATH);
            await initializer.run();
            logger.info('Main', 'AppInitializer finished successfully.');
        } catch (error) {
            // Although AppInitializer has its own error handling, catch any unexpected top-level errors
            logger.error('Main', 'Critical error during AppInitializer execution:', error);
            // Display a fallback error message if the initializer failed very early
            const container = document.getElementById(CANVAS_CONTAINER_ID);
            if (container && !container.hasChildNodes()) { // Check if container is empty
                container.innerHTML = `<p style="color: red; padding: 20px;">Application failed to start. ${error.message}</p>`;
            }
        }

    })(); // End async IIFE

    // Cleanup is now handled within AppInitializer
});
