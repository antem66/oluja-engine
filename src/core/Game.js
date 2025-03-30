/**
 * @module Game
 * @description Main game class, orchestrator, and update loop.
 * Initializes PixiJS, loads assets, creates layers and managers,
 * and manages the main game update cycle.
 * 
 * Dependencies (Injected via constructor):
 * - eventBus: Instance of EventBus for decoupled communication.
 * - featureManager: Instance of FeatureManager for feature flags.
 * - logger: Instance of Logger for logging.
 * - apiService: Instance of ApiService for server communication.
 */

import * as PIXI from 'pixi.js';
import * as SETTINGS from '../config/gameSettings.js';
import { REEL_STRIPS } from '../config/reelStrips.js';
// Import animation settings
import {
    // stopDelayBase, // No longer used directly here
    winAnimDelayMultiplier, // Still used in handleSpinEnd
    REEL_STOP_STAGGER, baseSpinDuration, stopTweenDuration, // Normal settings
    turboBaseSpinDuration, turboReelStopStagger // Turbo settings
} from '../config/animationSettings.js';
import { state, updateState, initGameState, destroyGameState } from './GameState.js';
// Re-add Reel import for JSDoc hints in debug methods temporarily moved to SpinManager
import { Reel } from './Reel.js';
// Removed ButtonFactory import - now handled by UIManager
// import { createButton, loadButtonAssets } from '../ui/ButtonFactory.js';
// Removed handlers import - Button handlers are now internal to UIManager or called via SpinManager
// import * as handlers from '../ui/ButtonHandlers.js';
import { initInfoOverlay, updateInfoOverlay } from '../ui/InfoOverlay.js';
import { initNotifications } from '../ui/Notifications.js'; // init only
import * as WinEvaluation from '../features/WinEvaluation.js'; // Import the module itself
import { init as initPaylineGraphics } from '../features/PaylineGraphics.js'; // Import clearWinLines here
import { initFreeSpins, handleFreeSpinEnd } from '../features/FreeSpins.js';
import { initTurboMode, applyTurboSettings } from '../features/TurboMode.js';
import { initAnimations, updateParticles } from '../features/Animations.js'; // Import updateParticles here
import { UIManager } from '../ui/UIManager.js'; // Import UIManager class
import { LogoManager } from '../ui/LogoManager.js'; // Corrected path
import { FreeSpinsUIManager } from '../ui/FreeSpinsUIManager.js'; // Import FreeSpinsUIManager
import { BackgroundManager } from './BackgroundManager.js'; // Import BackgroundManager
import { ReelManager } from './ReelManager.js'; // Import ReelManager
import { SpinManager } from './SpinManager.js'; // Import SpinManager
import { SYMBOL_DEFINITIONS } from '../config/symbolDefinitions.js'; // Import symbol defs for asset loading
import { initDebugPanel } from '../ui/DebugPanel.js'; // Import debug panel
import { gsap } from 'gsap'; // Import GSAP for animations
import { loadButtonAssets } from '../ui/ButtonFactory.js'; // Keep loadButtonAssets
import { globalEventBus } from '../utils/EventBus.js'; // Keep for type hinting
import { featureManager } from '../utils/FeatureManager.js'; // Keep for type hinting
import { logger } from '../utils/Logger.js'; // Keep for type hinting
import { ResultHandler } from './ResultHandler.js'; // Import ResultHandler
import { AnimationController } from './AnimationController.js'; // Import new controller
import { PluginSystem } from './PluginSystem.js'; // <-- Import PluginSystem
import { AutoplayPlugin } from '../plugins/AutoplayPlugin.js'; // <-- Import the new plugin

/**
 * @typedef {object} GameDependencies
 * @property {import('../utils/Logger.js').Logger} logger
 * @property {import('../utils/EventBus.js').EventBus} eventBus
 * @property {import('./ApiService.js').ApiService} apiService
 * @property {import('../utils/FeatureManager.js').FeatureManager} featureManager
 * @property {object} initialState // Add initial state type
 */

// --- Module-level variables ---
let app = null; // Pixi Application instance
// let reels = []; // Array of Reel instances - Now managed by ReelManager
let infoOverlayElement; // DOM element for info overlay

// Removed old FS UI variables


// --- Game Class ---
export class Game {
    /** @type {PIXI.Container | null} */
    layerBackground = null;
    /** @type {PIXI.Container | null} */
    layerReels = null;
    /** @type {PIXI.Container | null} */
    layerWinLines = null;
    /** @type {PIXI.Container | null} */
    layerUI = null;
    /** @type {PIXI.Container | null} */
    layerLogo = null;
    /** @type {PIXI.Container | null} */
    layerOverlays = null; // Main container for sub-overlays
    /** @type {PIXI.Container | null} */
    layerParticles = null;
    /** @type {PIXI.Container | null} */
    layerDebug = null;
    /** @type {PIXI.Container | null} */ // New Layer Property
    layerFullScreenEffects = null;

    // Dedicated Sub-containers for overlays
    /** @type {PIXI.Container | null} */
    fsIndicatorContainer = null;
    /** @type {PIXI.Container | null} */
    notificationsContainer = null;
    /** @type {PIXI.Container | null} */
    winAnnouncementsContainer = null;

    /** @type {PIXI.Sprite | null} */
    backgroundSprite = null;
    /** @type {FreeSpinsUIManager | null} */
    freeSpinsUIManager = null;
    /** @type {BackgroundManager | null} */
    backgroundManager = null;
    /** @type {ReelManager | null} */
    reelManager = null;
    /** @type {SpinManager | null} */
    spinManager = null;
    /** @type {ResultHandler | null} */
    resultHandler = null; // Add ResultHandler instance
    /** @type {UIManager | null} */ // Add UIManager instance property
    uiManager = null;
    /** @type {AnimationController | null} */ // Add property for the instance
    animationController = null;
    /** @type {PluginSystem | null} */ // <-- Add PluginSystem instance property
    pluginSystem = null;

    /** @type {object | null} */ // Changed type annotation
    deps = null; // To store injected dependencies

    /** @type {HTMLElement | null} */
    canvasContainer = null;

    /** @type {object | null} */
    initialState = null; // Add property to store initial state
    wasSpinning = false; // Add flag to track previous spin state

    /**
     * @property {UIManager} uiManager
     * @property {ResultHandler} resultHandler
     * @property {AnimationController} animationController // Add new dependency type
     */

    /**
     * @param {string} canvasContainerId - ID of the DOM element to contain the canvas.
     * @param {GameDependencies} dependencies - Core services + initial state.
     */
    constructor(canvasContainerId, /** @type {GameDependencies} */ dependencies) {
        this.canvasContainer = document.getElementById(canvasContainerId);
        if (!this.canvasContainer) {
            const log = dependencies?.logger?.error || console.error;
            log('Game: Constructor', `Canvas container #${canvasContainerId} not found.`);
            return;
        }
        if (!dependencies || !dependencies.logger || !dependencies.eventBus || !dependencies.apiService || !dependencies.featureManager) {
            const log = dependencies?.logger?.error || console.error;
            log('Game: Constructor', 'Core dependencies (logger, eventBus, apiService, featureManager) are required!');
            return;
        }
        if (!dependencies.initialState) {
            (dependencies.logger || console).error('Game: Constructor', 'Initial state is required in dependencies!');
            return;
        }

        // Store core dependencies and initial state
        this.deps = dependencies;
        this.initialState = dependencies.initialState;

        this.deps.logger.info('Game', 'Game instance created.');
    }

    async init() {
        // Access logger via this.deps.logger
        this.deps.logger.info('Game', 'Initialization started...');
        try {
            this._exposeGlobals();
            await this._setupPixiApp();
            await this._loadAssets();
            this._createLayers();
            this._createManagers(); // Create managers first

            // Check if managers were created successfully before proceeding
            if (!this.backgroundManager || !this.reelManager || !this.animationController || !this.uiManager || !this.spinManager || !this.resultHandler || !this.freeSpinsUIManager) {
                (this.deps.logger || console).error('Game', 'Core manager creation failed. Halting initialization.');
                return;
            }

            const winLineGraphics = new PIXI.Graphics();
            this._createGameElements(winLineGraphics);
            this._initCoreModules(winLineGraphics); // Init modules, passing managers

            this._finalizeSetup();
            console.log("Game Initialized Successfully");

        } catch (err) {
            console.error("PixiJS or Game Init Failed:", err);
            if (this.canvasContainer) {
                this.canvasContainer.innerHTML = `Error initializing graphics: ${err.message}. Check console.`;
            }
        }
    }

    // --- Helper function to create a layer ---
    /**
     * Creates a named PIXI Container with a specific zIndex.
     * @param {string} name - The name for the layer (for debugging).
     * @param {number} zIndex - The z-index for sorting.
     * @returns {PIXI.Container} The created layer container.
     * @private
     */
    _createLayer(name, zIndex) {
        const layer = new PIXI.Container();
        layer.name = name;
        layer.zIndex = zIndex;
        return layer;
    }
    // --- End helper function ---

    _exposeGlobals() {
        // Make this instance and managers accessible globally for debugging
        if (typeof window !== 'undefined') {
            // @ts-ignore - Dynamically adding properties
            window.gameApp = this; // Expose Game instance
            // Managers will be added later
        }
    }

    async _setupPixiApp() {
        app = new PIXI.Application();
        globalThis.__PIXI_APP__ = app;
        await app.init({
            width: SETTINGS.GAME_WIDTH,
            height: SETTINGS.GAME_HEIGHT,
            backgroundColor: SETTINGS.normalBgColor,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });
        if (app?.canvas && this.canvasContainer) {
            this.canvasContainer.appendChild(app.canvas);
        } else {
            throw new Error("Pixi Application or canvas could not be initialized.");
        }
    }

    async _loadAssets() {
        const symbolAssets = SYMBOL_DEFINITIONS.map(def => ({
            alias: def.id,
            src: `assets/images/${def.id}.png`
        }));
        symbolAssets.push({ alias: 'BG_IMAGE', src: 'assets/images/background/bg.png' });

        console.log("Loading symbol assets:", symbolAssets);
        await PIXI.Assets.load(symbolAssets);
        console.log("Symbol assets loaded.");

        console.log("Loading button assets...");
        await loadButtonAssets(); // Keep this call
    }

    _createLayers() {
        // Use the helper function to create main layers
        this.layerBackground = this._createLayer("Layer: Background", 0);
        this.layerReels = this._createLayer("Layer: Reels", 10);
        this.layerWinLines = this._createLayer("Layer: Win Lines", 20);
        this.layerUI = this._createLayer("Layer: UI", 30);
        this.layerLogo = this._createLayer("Layer: Logo", 40);
        this.layerFullScreenEffects = this._createLayer("Layer: Full Screen Effects", 45); // Above Logo, below Overlays
        this.layerOverlays = this._createLayer("Layer: Overlays", 50);
        this.layerParticles = this._createLayer("Layer: Particles", 60);
        this.layerDebug = this._createLayer("Layer: Debug", 100);
        this.layerDebug.visible = false; // Specific property for Debug layer

        // Create dedicated overlay sub-containers
        this.fsIndicatorContainer = new PIXI.Container();
        this.fsIndicatorContainer.name = "OverlaySub: FS Indicator";

        this.notificationsContainer = new PIXI.Container();
        this.notificationsContainer.name = "OverlaySub: Notifications";

        this.winAnnouncementsContainer = new PIXI.Container();
        this.winAnnouncementsContainer.name = "OverlaySub: Win Announcements";

        // Add sub-containers to the main overlay layer (order matters for stacking)
        if (this.layerOverlays && this.fsIndicatorContainer && this.notificationsContainer && this.winAnnouncementsContainer) {
            this.layerOverlays.addChild(this.fsIndicatorContainer);
            this.layerOverlays.addChild(this.notificationsContainer);
            this.layerOverlays.addChild(this.winAnnouncementsContainer);
        } else {
            console.error("Game Init Error: Failed to create overlay sub-containers.");
        }

        // Add main layers to stage - include the new layer
        // Update the null check condition to include layerFullScreenEffects
        if (app?.stage && this.layerBackground && this.layerReels && this.layerWinLines && this.layerUI && this.layerLogo && this.layerFullScreenEffects && this.layerOverlays && this.layerParticles && this.layerDebug) {
            app.stage.addChild(this.layerBackground, this.layerReels, this.layerWinLines, this.layerUI, this.layerLogo, this.layerFullScreenEffects, this.layerOverlays, this.layerParticles, this.layerDebug);
        } else {
            console.error("Game Init Error: One or more layers failed to initialize before adding to stage.");
        }

        // <<< ADD POSITIONING HERE >>>
        if (this.layerWinLines) {
            this.layerWinLines.position.set(SETTINGS.reelAreaX, SETTINGS.reelAreaY);
            logger?.debug('Game', `Positioned layerWinLines at (${SETTINGS.reelAreaX}, ${SETTINGS.reelAreaY})`);
        }
        // <<< END POSITIONING >>>
    }

    _createManagers() {
        const { logger, eventBus, apiService, featureManager } = this.deps;
        if (!logger || !eventBus || !apiService || !featureManager) {
            console.error("Game Init Error: Core dependencies missing in Game instance.");
            return;
        }
        if (!this.layerBackground || !this.layerReels || !app?.ticker || !this.layerLogo || !this.fsIndicatorContainer || !this.layerUI) {
            console.error("Game Init Error: Required layers or ticker not available for manager creation.");
            return;
        }

        // Instantiate managers with correct arguments
        this.backgroundManager = new BackgroundManager(this.layerBackground, logger);
        this.reelManager = new ReelManager(this.layerReels, app.ticker, logger);
        
        // Instantiate AnimationController first 
        this.animationController = new AnimationController({ logger, eventBus });
        this.animationController.init();
        
        // Now instantiate UIManager, passing animationController
        this.uiManager = new UIManager({
            parentLayer: this.layerUI, logger, eventBus, featureManager,
            animationController: this.animationController
        });
        this.spinManager = new SpinManager(this.reelManager, logger, eventBus, apiService);
        this.resultHandler = new ResultHandler({ eventBus, logger, reelManager: this.reelManager });
        this.resultHandler.init();

        this.freeSpinsUIManager = new FreeSpinsUIManager(this.fsIndicatorContainer, logger, eventBus);
        new LogoManager(this, this.layerLogo, logger, eventBus);

        // Instantiate PluginSystem - AFTER core dependencies are ready
        // --- BEGIN EDIT ---
        // Assemble a complete dependencies object for plugins
        const pluginDependencies = {
            ...this.deps, // Spread the initial dependencies (logger, eventBus, apiService, featureManager, initialState)
            spinManager: this.spinManager,
            layerUI: this.layerUI, // Pass the UI layer container
            uiManager: this.uiManager, // Add the UIManager instance itself
            // Provide access to the button factory (assuming UIManager exposes it or we import it directly)
            // Let's assume we need to import createButton for now if UIManager doesn't expose it.
            // If UIManager *does* expose it (e.g., this.uiManager.buttonFactory), use that instead.
            // Check UIManager structure - it seems it uses the imported createButton directly.
            // So, plugins needing it might need direct import, or we pass the function itself.
            // Passing the imported function reference:
            factories: { 
                createButton: this.uiManager?.buttonFactory // Get from UIManager instance
            }
            // Add other managers/layers plugins might need: animationController, reelManager, etc.
            // Example:
            // animationController: this.animationController, 
            // reelManager: this.reelManager,
        };
        this.pluginSystem = new PluginSystem(pluginDependencies);
        // --- END EDIT ---
        // Register plugins here
        this.pluginSystem.registerPlugin(AutoplayPlugin); 

        this.backgroundSprite = this.backgroundManager ? this.backgroundManager.backgroundSprite : null;

        // Expose managers for debug panel access
        if (typeof window !== 'undefined') {
            // @ts-ignore
            window.gameApp = this;
            // @ts-ignore
            window.gameApp.backgroundManager = this.backgroundManager;
            // @ts-ignore
            window.gameApp.freeSpinsUIManager = this.freeSpinsUIManager;
            // @ts-ignore
            window.gameApp.reelManager = this.reelManager;
            // @ts-ignore
            window.gameApp.spinManager = this.spinManager;
            // @ts-ignore
            window.gameApp.resultHandler = this.resultHandler;
            // @ts-ignore
            window.gameApp.uiManager = this.uiManager;
            // @ts-ignore
            window.gameApp.animationController = this.animationController;
        }
        logger.info('Game', 'Core managers created and dependencies injected.');
    }

    /**
     * @param {PIXI.Graphics} winLineGraphics
     */
    _createGameElements(winLineGraphics) {
        if (this.layerWinLines) {
            this.layerWinLines.addChild(winLineGraphics);
        }
    }

    /**
     * @param {PIXI.Graphics} winLineGraphics
     */
    _initCoreModules(winLineGraphics) {
        const { logger, eventBus, featureManager, apiService } = this.deps;
        // Ensure dependencies and managers are available
        if (!logger || !eventBus || !featureManager || !apiService || !app || !this.notificationsContainer || !this.winAnnouncementsContainer || !this.layerDebug || !this.layerFullScreenEffects || !this.spinManager || !this.animationController || !this.backgroundManager || !this.reelManager || !this.uiManager) {
            (logger || console).error('Game', '_initCoreModules: Missing dependencies, managers, layers, or app instance.');
            return;
        }

        // Managers already checked in init(), null check here mainly for type safety downstream

        if (!this.initialState) { // Add check for initial state
            (this.deps.logger || console).error('Game', '_initCoreModules: Initial state missing.');
            return;
        }

        // Define UI styles 
        const uiStyles = {
            label: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 14, fill: 0xAAAAAA }),
            balanceValue: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 20, fontWeight: 'bold', fill: 0xFFFFFF }),
            betValue: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 20, fontWeight: 'bold', fill: 0xFFFFFF }),
            winValue: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 20, fontWeight: 'bold', fill: 0xFFFF00 }),
            winRollup: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 24, fontWeight: 'bold', fill: 0xFFFF00, stroke: { color: 0x000000, width: 2 } }),
        };

        // Init UIManager, passing initial state
        this.uiManager.init(uiStyles, this.initialState);

        // Prepare dependencies object for modules needing multiple managers
        const moduleDeps = {
            logger, eventBus, featureManager, apiService,
            reelManager: this.reelManager, uiManager: this.uiManager, app: app,
            spinManager: this.spinManager, animationController: this.animationController,
            backgroundManager: this.backgroundManager,
            initialState: this.initialState, // Pass initial state if needed by others
        };

        // Initialize modules, passing specific dependencies they need
        initPaylineGraphics({ ...moduleDeps, graphics: winLineGraphics });
        WinEvaluation.init({ ...moduleDeps });

        // Init utility UI modules with specific deps
        if (this.notificationsContainer) {
            initNotifications(this.notificationsContainer); // Pass container directly
        } else { logger.error('Game', 'Cannot init Notifications, container missing.'); }

        const infoOverlayElement = document.getElementById('info-overlay');
        if (infoOverlayElement) {
            initInfoOverlay(infoOverlayElement); // Pass element directly
        } else { logger.warn('Game', 'InfoOverlay element #info-overlay not found in DOM.'); }

        if (this.layerDebug) {
            // Call initDebugPanel with direct args based on its signature
            initDebugPanel(app, this.layerDebug);
        } else { logger.error('Game', 'Cannot init DebugPanel, layer missing.'); }

        // Update particle animations
        updateParticles(0);

        // Update Animations module
        if (this.winAnnouncementsContainer && this.layerParticles) {
            initAnimations({
                logger: logger,
                eventBus: eventBus,
                animationController: this.animationController,
                overlayContainer: this.winAnnouncementsContainer,
                particleContainer: this.layerParticles
            });
        } else {
            logger.error('Game', 'Cannot initialize Animations: Missing required layers.');
        }

        // Initialize Feature Modules using full moduleDeps
        initTurboMode({ ...moduleDeps });
        initFreeSpins({
            ...moduleDeps,
            effectsLayer: this.layerFullScreenEffects
        });

        logger.info('Game', 'Core modules initialized.');
    }

    _finalizeSetup() {
        // Final stage sort
        if (app?.stage) {
            app.stage.sortChildren();
            console.log("Stage children sorted by zIndex:", app.stage.children.map(c => ({ name: c.name, zIndex: c.zIndex })));
        } else {
            console.error("Finalize Setup Error: Pixi stage not available for sorting.");
        }

        // Initial UI updates and state settings are now handled by UIManager listening to events
        // updateDisplays(); // REMOVED
        // setButtonsEnabled(true); // REMOVED
        applyTurboSettings(state.isTurboMode); // Keep this? Turbo logic might need initial application

        // Start game loop
        if (app?.ticker) {
            app.ticker.add(this.update.bind(this));
        } else {
            throw new Error("Pixi ticker not available after init.");
        }
        
        // Initialize registered plugins AFTER main setup but BEFORE loop starts
        this.pluginSystem?.initializePlugins();
    }

    // Removed setupUI method

    /**
     * @param {PIXI.Ticker} ticker
     */
    update(ticker) {
        const delta = ticker.deltaTime;
        const now = ticker.lastTime;
        let anyReelMoving = false;

        // Add log at start of update
        // logger?.debug('Game.update', `Tick - Delta: ${delta.toFixed(2)}`); 

        try {
            // Update reels via ReelManager - Add null check
            if (this.reelManager) {
                anyReelMoving = this.reelManager.update(delta, now);
                // Log result from ReelManager
                // logger?.debug('Game.update', `ReelManager returned anyReelMoving: ${anyReelMoving}`); 
            }

            // Update particle animations
            updateParticles(delta);

            // Update Free Spins Indicator via manager - Add null check
            if (this.freeSpinsUIManager) {
                this.freeSpinsUIManager.update();
            }

            // Capture current spinning state *before* the check
            this.wasSpinning = state.isSpinning; 

            // --- Spin End Check (Revised) ---
            const conditionMet = this.wasSpinning && !anyReelMoving;
            // Use console.log directly to bypass Logger issues - REMOVE
            // console.log('Game.update EvalCondition:', { wasSpinning: this.wasSpinning, anyReelMoving, conditionMet });
            // --- REMOVE LOGGING --- 
            // Log only on the frame the condition *should* be met or just failed when spinning
            // if (this.wasSpinning && !anyReelMoving) { 
            //     this.deps.logger?.info('Game.update SpinEnd Check:', { 
            //         wasSpinning: this.wasSpinning, 
            //         anyReelMoving: anyReelMoving, 
            //         conditionMet: conditionMet 
            //     });
            // }
            // --- END LOGGING REMOVAL ---

            if (conditionMet) {
                 logger?.info('Game.update', '>>> Spin End IF Block ENTERED <<<'); 
                 logger?.info('Game.update', 'Spin end condition MET (wasSpinning && !anyReelMoving)!'); 
                 
                 // Prevent re-triggering immediately
                 this.wasSpinning = false; 
                 
                 // No need to set isTransitioning here, handleSpinEnd does it.
                 // updateState({ isTransitioning: true }); 
                 
                 // REMOVE setTimeout, call directly:
                 if (this.spinManager) {
                     logger?.debug('Game.update', 'Calling spinManager.handleSpinEnd() directly.');
                     this.spinManager.handleSpinEnd();
                 } else {
                     console.error("Game.update Error: Spin ended but SpinManager is not available.");
                     updateState({ isSpinning: false, isTransitioning: false }); 
                 }
                 // END of direct call
            }
        } catch (err) {
            console.error("Error in game loop:", err);
            if (app?.ticker) {
                app.ticker.stop();
            }
            alert("Game loop critical error. Check console.");
        }
    }

    // Removed handleSpinEnd method - now handled by SpinManager

    /**
     * Generate a random winning pattern
     * NOTE: Kept here temporarily for SpinManager dependency. Should move later.
     * @returns {{symbol: string, positions: number[]}} A winning pattern with symbol and positions
     */
    generateRandomWinPattern() {
        const highValueSymbols = ["FACE1", "FACE2", "FACE3", "KNIFE", "CUP", "PATCH"];
        const winSymbol = highValueSymbols[Math.floor(Math.random() * highValueSymbols.length)];
        const rowIndex = 1;
        const winLength = Math.floor(Math.random() * 3) + 3;
        const positions = [];
        for (let i = 0; i < SETTINGS.NUM_REELS; i++) {
            if (i < winLength) {
                positions.push(rowIndex);
            } else {
                positions.push(Math.floor(Math.random() * SETTINGS.SYMBOLS_PER_REEL_VISIBLE));
            }
        }
        return { symbol: winSymbol, positions: positions };
    }

    /**
     * Find the stop index that will show the target symbol in the target position
     * NOTE: Kept here temporarily for SpinManager dependency. Should move later.
     * @param {Reel} reel - The reel object
     * @param {string} targetSymbol - The symbol we want to show
     * @param {number} targetPosition - The position where we want the symbol (0=top, 1=middle, 2=bottom)
     * @returns {number} The stop index that will show the target symbol in position
     */
    findStopIndexForSymbol(reel, targetSymbol, targetPosition) {
        const symbols = reel.strip;
        if (!symbols) return Math.floor(Math.random() * (reel.strip?.length || 1));

        for (let i = 0; i < symbols.length; i++) {
            if (symbols[i] === targetSymbol) {
                let stopIndex = (i - targetPosition + symbols.length) % symbols.length;
                return stopIndex;
            }
        }
        console.log(`Could not find symbol ${targetSymbol} on reel ${reel.reelIndex} - using random position`);
        return Math.floor(Math.random() * symbols.length);
    }

    // Removed adjustBackground method - now handled by BackgroundManager

    destroy() {
        this.deps.logger?.info('Game', 'Destroying game instance...');
        // Destroy plugins first
        this.pluginSystem?.destroyPlugins();

        // Destroy modules & managers 
        this.resultHandler?.destroy();
        this.uiManager?.destroy();
        this.animationController?.destroy();
        this.spinManager?.destroy(); // Assuming SpinManager might have destroy later
        this.reelManager?.destroy(); // Uncommented
        this.backgroundManager?.destroy(); // Uncommented
        this.freeSpinsUIManager?.destroy(); // Uncommented
        // TODO: Call destroy on TurboMode, Autoplay, FreeSpins if they implement it
        // Call destroy on feature modules
        // Assuming they are exported functions for now
        // Need to import them first
        // import { destroy as destroyTurbo } from '../features/TurboMode.js';
        // destroyTurbo?.(); // Example call
        // import { destroy as destroyAutoplay } from '../features/Autoplay.js';
        // destroyAutoplay?.(); 
        // import { destroy as destroyFreeSpins } from '../features/FreeSpins.js';
        // destroyFreeSpins?.();
        // import { destroy as destroyPaylineGraphics } from '../features/PaylineGraphics.js';
        // destroyPaylineGraphics?.();
        // import { destroy as destroyWinEvaluation } from '../features/WinEvaluation.js';
        // destroyWinEvaluation?.();
        // import { destroy as destroyAnimations } from '../features/Animations.js';
        // destroyAnimations?.();

        // Stop ticker
        app?.ticker?.stop(); // Use module-level app

        // Destroy Pixi Application
        if (app?.stage) {
            app.stage.destroy({ children: true });
        }
        if (app) {
            app.destroy(true, { children: true });
            app = null;
            globalThis.__PIXI_APP__ = undefined;
        }

        // Destroy GameState AFTER other cleanup
        destroyGameState();

        // Remove global references
        if (typeof window !== 'undefined') {
            // @ts-ignore
            delete window.gameApp;
        }

        this.deps.logger?.info('Game', 'Destroyed game instance.');

        // Nullify references
        this.layerBackground = null;
        this.layerReels = null;
        this.layerWinLines = null;
        this.layerUI = null;
        this.layerLogo = null;
        this.layerOverlays = null;
        this.layerParticles = null;
        this.layerDebug = null;
        this.layerFullScreenEffects = null;
        this.fsIndicatorContainer = null;
        this.notificationsContainer = null;
        this.winAnnouncementsContainer = null;
        this.backgroundSprite = null;
        this.freeSpinsUIManager = null;
        this.backgroundManager = null;
        this.reelManager = null;
        this.spinManager = null;
        this.resultHandler = null;
        this.uiManager = null;
        this.animationController = null;
        this.canvasContainer = null;
        this.winLineGraphics = null; // Nullify graphics reference used by legacy modules
        this.deps = null; // Clear deps object
        this.pluginSystem = null; // <-- Nullify PluginSystem
    }
}

// Removed old FS UI functions (createFreeSpinsIndicator, updateFreeSpinsIndicator, startGlowAnimation, stopGlowAnimation)


// --- Global Functions used by other modules ---

// Removed global startSpinLoop function - now handled by SpinManager.startSpin()
