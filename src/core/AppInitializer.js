import * as PIXI from 'pixi.js';
import { logger } from '../utils/Logger.js';
import { LoadingScreen } from './LoadingScreen.js';
import { AssetLoader } from '../utils/AssetLoader.js';
import { Game } from './Game.js';
import { EventBus } from '../utils/EventBus.js'; // Assuming EventBus exists
import { initGameState } from './GameState.js'; // Adjust path if needed
// Import other necessary dependencies like ApiService, FeatureManager etc. as needed
import { ApiService } from './ApiService.js';
import { FeatureManager } from '../utils/FeatureManager.js'; // Corrected path
import * as SETTINGS from '../config/gameSettings.js';

/**
 * Orchestrates the application initialization sequence:
 * 1. Sets up Pixi Application.
 * 2. Shows Loading Screen.
 * 3. Loads main assets.
 * 4. Initializes core services (State, API, etc.).
 * 5. Hides Loading Screen.
 * 6. Creates and initializes the Game instance.
 */
export class AppInitializer {
    _canvasContainerId;
    _assetManifest;
    _studioLogoPath;
    /** @type {PIXI.Application | null} */ _app = null;
    /** @type {LoadingScreen | null} */ _loadingScreen = null;
    /** @type {Game | null} */ _gameInstance = null;
    /** @type {(() => void) | null} */
    _resizeHandler = null; // Store the bound resize handler for removal

    /**
     * @param {string} canvasContainerId - The ID of the HTML element to contain the Pixi canvas.
     * @param {any} assetManifest - The manifest object/array for AssetLoader.
     * @param {string} studioLogoPath - Path to the studio logo for the loading screen.
     */
    constructor(canvasContainerId, assetManifest, studioLogoPath) {
        this._canvasContainerId = canvasContainerId;
        this._assetManifest = assetManifest;
        this._studioLogoPath = studioLogoPath; 
    }

    /**
     * Starts the entire application initialization process.
     */
    async run() {
        logger.info('AppInitializer', 'Starting initialization sequence...');
        let loadingScreenShowPromise = null; // To store the promise
        try {
            await this._setupPixiApp();
            this._setupResizeHandler(); // Setup resize handling after app is created
            // Start showing loading screen, store the promise
            loadingScreenShowPromise = this._showLoadingScreen(); 
            await this._loadAssets();
            // Now, ensure loading screen fade-in is complete before proceeding
            if (loadingScreenShowPromise) {
                await loadingScreenShowPromise;
            }
            const dependencies = this._initializeCoreServices();
            await this._hideLoadingScreen(); // hide() logic will now work correctly
            this._createAndInitGame(dependencies);
            this._setupUnloadCleanup();
            logger.info('AppInitializer', 'Initialization sequence complete.');
        } catch (error) {
            logger.error('AppInitializer', 'Initialization failed:', error);
            this._handleInitializationError(error);
        }
    }

    /**
     * Creates and configures the PIXI.Application.
     * @private
     */
    async _setupPixiApp() {
        logger.info('AppInitializer', 'Setting up Pixi Application...');
        const canvasContainer = document.getElementById(this._canvasContainerId);
        if (!canvasContainer) {
            throw new Error(`Canvas container #${this._canvasContainerId} not found.`);
        }

        this._app = new PIXI.Application()
        globalThis.__PIXI_APP__ = this._app;
        // TODO: Configure app dimensions, background color, resolution etc. from gameSettings
        // Example: await this._app.init({ background: '#1099bb', resizeTo: canvasContainer });
        // Need to await init() for v8
        // Consider making this async and awaiting init if settings are needed
        await this._app.init({ 
            resizeTo: window, 
            backgroundColor: 0x000000, // Default, can be overridden
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
         });
        // Append canvas after init completes
        if (canvasContainer.firstChild) {
            canvasContainer.innerHTML = ''; 
        }
        canvasContainer.appendChild(this._app.canvas);
        logger.info('AppInitializer', 'Pixi App initialized and added to DOM.');
    }

    /**
     * Creates and shows the LoadingScreen.
     * @private
     */
    _showLoadingScreen() {
        if (!this._app) throw new Error("Pixi App not initialized before showing loading screen.");
        logger.info('AppInitializer', 'Initializing and showing Loading Screen...');
        this._loadingScreen = new LoadingScreen(this._app.stage, this._app.renderer);
        // Return the promise from show()
        return this._loadingScreen.show(this._studioLogoPath).catch(err => {
            // Still log warning, but don't throw here, let the main run catch block handle critical failures
            logger.warn('AppInitializer', 'Loading screen show animation failed:', err); 
            // Optionally return a resolved promise or null if show fails non-critically
            return Promise.resolve(); 
        });
    }

    /**
     * Loads the main game assets using AssetLoader.
     * @private
     */
    async _loadAssets() {
        // Restore loading screen check
        if (!this._loadingScreen) throw new Error("Loading screen not ready for progress updates.");
        logger.info('AppInitializer', 'Loading main game assets...');
        
        // Restore progressCallback definition
        const progressCallback = (progress) => {
            // console.log(`AppInitializer received progress from AssetLoader: ${progress}`); // Keep commented for now
            this._loadingScreen?.updateProgress(progress);
        };
        
        // Load assets WITH the progress callback
        await AssetLoader.load(this._assetManifest, progressCallback);
        
        // Restore the final updateProgress(1) call
        // This ensures 100% is reported even if loader doesn't fire for 1.0
        this._loadingScreen?.updateProgress(1); 

        logger.info('AppInitializer', 'Main game assets loaded.');
    }

    /**
     * Initializes core services like State, API, EventBus.
     * @returns {object} The dependencies object for the Game class.
     * @private
     */
    _initializeCoreServices() {
        logger.info('AppInitializer', 'Initializing core services...');
        const eventBus = new EventBus();
        const featureManager = new FeatureManager();
        featureManager.loadFlags({ /* Load flags from config or API */ 'debugPanel': true }); 
        const apiService = new ApiService({ logger, eventBus, featureManager });

        // --- Game State Setup ---
        // TODO: Get initial values from gameSettings or API response
        const initialBalance = 100.00;
        const initialBetPerLine = 0.01;
        const initialRawState = {
            balance: initialBalance,
            currentBetPerLine: initialBetPerLine,
            // Calculate total bet based on lines from config?
            currentTotalBet: initialBetPerLine * 50, 
            currentCurrency: 'EUR',
            isDebugMode: true, 
            forceWin: '',
            // ... other initial state ...
        };
        const initialState = initGameState({
            logger,
            eventBus,
            initialState: initialRawState 
        });
        logger.info('AppInitializer', 'Initial game state created.');
        // -----------------------

        const dependencies = {
            logger,
            eventBus,
            apiService,
            featureManager,
            initialState,
            app: this._app, // Pass the Pixi App instance
        };
        return dependencies;
    }
    
    /**
     * Hides the loading screen.
     * @private
     */
    async _hideLoadingScreen() {
        if (!this._loadingScreen) return;
        logger.info('AppInitializer', 'Hiding loading screen...');
        await this._loadingScreen.hide();
        logger.info('AppInitializer', 'Loading screen hidden.');
        // Optionally destroy the loading screen if it's not needed again
        // this._loadingScreen.destroy();
        // this._loadingScreen = null;
    }

    /**
     * Creates the Game instance and calls its init method.
     * @param {object} dependencies - The dependencies object created by _initializeCoreServices.
     * @private
     */
    _createAndInitGame(dependencies) {
        logger.info('AppInitializer', 'Creating and initializing Game instance...');
        this._gameInstance = new Game(this._canvasContainerId, dependencies);
        // Intentionally not awaiting init here - let it run
        this._gameInstance.init().then(() => {
            logger.info('AppInitializer', 'Game initialization complete.');
        }).catch(err => {
             // Throw error to be caught by the main run() method's catch block
            throw new Error(`Game initialization failed: ${err.message}`); 
        });
    }

    /**
     * Sets up cleanup logic for window unload.
     * @private
     */
    _setupUnloadCleanup() {
        window.addEventListener('beforeunload', () => {
            logger.info('AppInitializer', 'Cleaning up before unload...');
            if (this._resizeHandler) {
                window.removeEventListener('resize', this._resizeHandler);
            }
            this._gameInstance?.destroy();
            // Call other cleanup functions if needed (e.g., destroyGameState)
        });
    }

    /**
     * Handles errors during the initialization process.
     * @param {Error} error 
     * @private
     */
    _handleInitializationError(error) {
        // Use loading screen to display error if it exists
        this._loadingScreen?.showError(`Initialization failed: ${error.message}`);
        
        // Also log to console
        console.error("Application Initialization Failed:", error);

        // Optionally display a message in the main container
        const canvasContainer = document.getElementById(this._canvasContainerId);
        if (canvasContainer) {
             canvasContainer.innerHTML = `<p style="color: red; padding: 20px;">Failed to initialize application. Check console for details.</p>`;
             // Ensure Pixi canvas is removed if it was added
             if (this._app?.canvas && this._app.canvas.parentNode === canvasContainer) {
                 canvasContainer.removeChild(this._app.canvas);
             }
        }
        // Clean up Pixi app if it was created
        this._app?.destroy(false, { children: true }); // Dont remove canvas view, do remove children
    }

    /**
     * Sets up the resize handler to scale and center the game stage.
     * @private
     */
    _setupResizeHandler() {
        if (!this._app) return;

        const gameWidth = SETTINGS.GAME_WIDTH;
        const gameHeight = SETTINGS.GAME_HEIGHT;
        const stage = this._app.stage;

        // Create the resize function
        const resize = () => {
            if (!this._app || !this._app.stage) return; // Guard against app/stage being destroyed

            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;

            // Calculate aspect ratios
            const gameAspectRatio = gameWidth / gameHeight;
            const screenAspectRatio = screenWidth / screenHeight;

            let scale = 1;
            let posX = 0;
            let posY = 0;

            // Determine scale factor and position based on aspect ratios (letterbox/pillarbox)
            if (screenAspectRatio > gameAspectRatio) {
                // Screen is wider than the game (letterbox)
                scale = screenHeight / gameHeight;
                posX = (screenWidth - gameWidth * scale) / 2;
                posY = 0;
            } else {
                // Screen is taller than the game (pillarbox)
                scale = screenWidth / gameWidth;
                posX = 0;
                posY = (screenHeight - gameHeight * scale) / 2;
            }

            // --- Apply scaling and positioning to CORE GAME layers --- 
            const coreLayersToScale = [
                stage.getChildByName("Layer: Background"),
                stage.getChildByName("Layer: Reels"),
                stage.getChildByName("Layer: Win Lines"),
                stage.getChildByName("Layer: Particles")
            ].filter(layer => layer); // Filter out nulls if a layer wasn't found

            if (coreLayersToScale.length < 4) {
                logger.warn('AppInitializer', 'Resize handler could not find all core game layers by name. Scaling might be incomplete.');
            }

            coreLayersToScale.forEach(layer => {
                if (layer) { 
                    layer.scale.set(scale);
                    layer.position.set(posX, posY);
                }
            });
            
            // --- Ensure UI ROOT container remains unscaled and at top-left --- 
            const uiRoot = stage.getChildByName("UIRootContainer");
            if (uiRoot) {
                uiRoot.scale.set(1); // Reset scale to 1
                uiRoot.position.set(0, 0); // Reset position to top-left
            } else {
                 logger.warn('AppInitializer', 'Resize handler could not find UIRootContainer by name. UI might not position correctly.');
            }

            // --- Remove direct scaling/positioning of the main stage ---
            // stage.scale.set(scale);
            // stage.position.set(posX, posY);
            
            logger.debug('AppInitializer', `Resized - Screen: ${screenWidth}x${screenHeight}, Game Scale: ${scale.toFixed(3)}, Game Pos: (${posX.toFixed(1)}, ${posY.toFixed(1)})`);
        };

        // Store the bound handler for removal later
        this._resizeHandler = resize;

        // Add event listener
        window.addEventListener('resize', this._resizeHandler);

        // Initial resize call
        resize();
        logger.info('AppInitializer', 'Resize handler set up.');
    }
}
