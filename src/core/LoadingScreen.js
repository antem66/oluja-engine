import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameSettings.js'; // <-- Import game dimensions

/**
 * Manages the display and updates of the loading screen.
 */
export class LoadingScreen {
    /** @type {PIXI.Container | null} */
    _stage = null; // Reference to the main stage
    /** @type {PIXI.Renderer | PIXI.AbstractRenderer | null} */
    _renderer = null; // Reference to the renderer for dimensions
    /** @type {PIXI.Container | null} */
    _container = null;
    /** @type {PIXI.Graphics | null} */
    _background = null;
    /** @type {PIXI.Sprite | null} */
    _logo = null;
    /** @type {PIXI.Graphics | null} */
    _progressBarBg = null;
    /** @type {PIXI.Graphics | null} */
    _progressBarFill = null;
    /** @type {PIXI.Text | null} */
    _progressText = null; // Optional text element

    _isVisible = false;
    _barWidth = 0;
    _barHeight = 5;
    /** @type {number | null} */ // Allow number or null
    _fullyVisibleStartTime = null; // Track when the screen becomes fully visible
    _minimumDisplayTimeMs = 3000; // Minimum time in milliseconds (Changed from 5000)
    _logoProgressBarGap = 30; // Configurable gap between logo bottom and bar top

    // --- Properties for smoothed progress ---
    _actualProgress = 0; // Latest reported progress (re-added)
    _visualProgressProxy = { value: 0 }; // Value animated by GSAP
    /** @type {object | null} */ 
    _visualTween = null; // Stores the smoothing tween
    _hideRequested = false; // Flag to track if hide() has been called
    _hideScheduled = false; // Flag to prevent multiple hide schedules
    /** @type {Function | null} */
    _resolveHidePromise = null; // Stores the resolve function for the hide() promise
    // --- End progress properties ---

    /**
     * Initializes the LoadingScreen.
     * @param {PIXI.Container} stage - The main PIXI Stage to add the screen to.
     * @param {PIXI.Renderer | PIXI.AbstractRenderer} renderer - The PIXI Renderer for dimensions.
     */
    constructor(stage, renderer) {
        this._stage = stage;
        this._renderer = renderer;
        this._container = new PIXI.Container();
        this._container.name = "LoadingScreenContainer";
        this._container.visible = false;
        this._container.alpha = 0;
        // Add to the provided stage
        if (this._stage) {
            this._stage.addChild(this._container);
        } else {
            console.error("LoadingScreen: Stage is required!");
            return; // Cannot proceed without stage
        }
        
        // Reset progress values
        this._actualProgress = 0;
        this._visualProgressProxy = { value: 0 };
        this._visualTween = null;
        this._hideRequested = false;
        this._hideScheduled = false;
        this._resolveHidePromise = null; // Ensure reset on construction

        this._createElements();
    }

    /**
     * Creates the visual elements of the loading screen.
     * @private
     */
    _createElements() {
        if (!this._container || !this._renderer) return;

        // Use logical game dimensions, not renderer (window) size
        // const screenWidth = this._renderer.width; 
        // const screenHeight = this._renderer.height;
        const gameWidth = GAME_WIDTH; 
        const gameHeight = GAME_HEIGHT;

        // Background should cover the logical game area
        this._background = new PIXI.Graphics();
        this._background.rect(0, 0, gameWidth, gameHeight); // Use game dimensions
        this._background.fill({ color: 0x000000, alpha: 1 });
        this._container.addChild(this._background);

        // Logo centered within the logical game area
        this._logo = new PIXI.Sprite();
        this._logo.anchor.set(0.5);
        this._logo.x = gameWidth / 2;
        this._logo.scale.set(0.5);
        this._logo.y = gameHeight / 2 - 50; // Position above logical center
        this._logo.alpha = 0; 
        this._container.addChild(this._logo);

        // Progress Bar width based on logical game width initially
        this._barWidth = gameWidth * 0.6; 
        const barX = (gameWidth - this._barWidth) / 2; // Center based on game width
        const barY = gameHeight / 2 + 30; // Position below logical center

        this._progressBarBg = new PIXI.Graphics();
        this._progressBarBg.rect(0, 0, this._barWidth, this._barHeight);
        this._progressBarBg.fill({ color: 0x333333 }); // Dark grey background
        this._progressBarBg.position.set(barX, barY);
        this._progressBarBg.alpha = 0; // Initially hidden
        this._container.addChild(this._progressBarBg);

        this._progressBarFill = new PIXI.Graphics();
        this._progressBarFill.rect(0, 0, 0, this._barHeight); // Start with 0 width
        this._progressBarFill.fill({ color: 0xCCCCCC }); // Light grey fill
        this._progressBarFill.position.set(barX, barY);
        this._progressBarFill.alpha = 0; // Initially hidden
        this._container.addChild(this._progressBarFill);
        
        // Optional Progress Text
        const textStyle = new PIXI.TextStyle({
            fontFamily: 'Arial', 
            fontSize: 14, 
            fill: 0xCCCCCC
        });
        this._progressText = new PIXI.Text({ text: 'Loading 0%', style: textStyle });
        this._progressText.anchor.set(0.5);
        this._progressText.x = gameWidth / 2; // Center based on game width
        this._progressText.y = barY + this._barHeight + 15;
        this._progressText.alpha = 0; // Initially hidden
        this._container.addChild(this._progressText);
    }

    /**
     * Shows the loading screen with a fade-in animation.
     * Starts the timed visual progress animation on completion.
     * @param {string} logoAssetPath - The path/URL of the logo asset to load.
     * @returns {Promise<void>} A promise that resolves when the show animation is complete.
     */
    async show(logoAssetPath) { 
        // Reset state for potential reuse
        this._actualProgress = 0;
        this._visualProgressProxy.value = 0;
        this._hideRequested = false; 
        this._hideScheduled = false;
        this._killVisualTween();
        this._updateVisualBarAndText(); 

        return new Promise(async (resolve) => {
            if (!this._container || !this._logo || !this._progressBarBg || !this._progressBarFill || !this._progressText) {
                console.error("LoadingScreen: Cannot show - elements not created.");
                resolve();
                return;
            }
            
            if (this._isVisible) {
                resolve(); // Already visible
                return;
            }

            // --- Load Logo Internally ---
            let logoTexture = null;
            const logoAlias = 'loadingScreenLogo';
            try {
                if (logoAssetPath) {
                    await PIXI.Assets.load({ alias: logoAlias, src: logoAssetPath });
                    logoTexture = PIXI.Assets.get(logoAlias);
                }
            } catch (error) {
                console.warn("LoadingScreen: Failed to load logo:", error);
                // Continue without logo
            }

            if (logoTexture && this._logo && this._renderer) {
                this._logo.texture = logoTexture;

                // --- Adjust Bar Width to Match Logo --- 
                this._barWidth = this._logo.width; // Use scaled logo width
                const barX = (GAME_WIDTH - this._barWidth) / 2; // Center based on GAME_WIDTH
                
                // Apply new position and redraw background bar
                if (this._progressBarBg) {
                    this._progressBarBg.position.x = barX;
                    this._progressBarBg.clear().rect(0, 0, this._barWidth, this._barHeight).fill({ color: 0x333333 });
                }
                
                // Apply new position for fill bar (width updated in _updateVisualBarAndText)
                if (this._progressBarFill) {
                    this._progressBarFill.position.x = barX; 
                }
                // --- End Bar Width Adjustment ---

                // Recalculate bar Y position based on actual logo height and the configured gap
                const barY = this._logo.y + (this._logo.height / 2) + this._logoProgressBarGap;
                if(this._progressBarBg) this._progressBarBg.y = barY;
                if(this._progressBarFill) this._progressBarFill.y = barY;
                if (this._progressText) {
                    this._progressText.y = barY + this._barHeight + 15; // Text remains relative to bar
                    // Center text horizontally based on new bar position/width (redundant if already centered on screen)
                    this._progressText.x = barX + this._barWidth / 2; 
                }
            } else if (this._logo && this._renderer) {
                this._logo.visible = false; // Hide logo element if texture failed
                 // If logo fails, fall back to a default width relative to GAME_WIDTH
                 this._barWidth = GAME_WIDTH * 0.6;
                 const barX = (GAME_WIDTH - this._barWidth) / 2; // Center based on GAME_WIDTH
                if (this._progressBarBg) {
                     this._progressBarBg.position.x = barX;
                     this._progressBarBg.clear().rect(0, 0, this._barWidth, this._barHeight).fill({ color: 0x333333 });
                 }
                 if(this._progressBarFill) {
                    this._progressBarFill.position.x = barX;
                 }
                 if(this._progressText) {
                    this._progressText.x = barX + this._barWidth / 2;
                 }
            }
            // --- End Logo Loading ---

            this._container.visible = true;
            this._isVisible = true;

            // Fade in the whole container and its elements
            gsap.to(this._container, { alpha: 1, duration: 0.5, ease: 'power1.out' });
            // Only fade in logo if it's visible
            const elementsToFade = this._logo?.visible 
                ? [this._logo, this._progressBarBg, this._progressBarFill, this._progressText] 
                : [this._progressBarBg, this._progressBarFill, this._progressText];
            gsap.to(elementsToFade.filter(el => el), 
                { 
                    alpha: 1, 
                    duration: 0.5, 
                    delay: 0.1, 
                    ease: 'power1.out', 
                    onComplete: () => {
                        this._fullyVisibleStartTime = performance.now(); 
                        console.log(`LoadingScreen fully visible at: ${this._fullyVisibleStartTime}`);
                        // Don't start timed animation here, updateProgress handles visuals
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * Starts the fixed-duration visual progress bar animation (0 to 100%).
     * @private
     */
    _startTimedVisualAnimation() {
        this._killVisualTween(); // Ensure no duplicates
        
        this._visualTween = gsap.to(this._visualProgressProxy, {
            value: 1, // Always animate to 100%
            duration: this._minimumDisplayTimeMs / 1000, // Duration is the minimum display time
            ease: 'none', // Linear ease for steady progress
            onUpdate: this._updateVisualBarAndText.bind(this), // Update visuals during animation
            onComplete: () => {
                this._visualTween = null; // Clear reference
                 // Ensure final state is exactly 100%
                this._visualProgressProxy.value = 1; 
                this._updateVisualBarAndText();
            }
        });
    }

    /**
     * Updates the visual representation (bar fill and text) based ONLY on _visualProgressProxy.
     * @private
     */
    _updateVisualBarAndText() {
        if (!this._progressBarFill || !this._progressText || !this._renderer || !this._progressBarBg) return;

        const displayProgress = this._visualProgressProxy.value;
        const clampedDisplayProgress = Math.max(0, Math.min(1, displayProgress)); // Clamp 0-1
        const percentage = Math.round(clampedDisplayProgress * 100);

        // Bar width is now set in show(), use GAME_WIDTH for centering X calculation
        const barX = (GAME_WIDTH - this._barWidth) / 2; 
        
        // Update background position and redraw (in case bar width changed)
        if (this._progressBarBg) { 
             this._progressBarBg.position.set(barX, this._progressBarBg.y);
             this._progressBarBg.clear().rect(0, 0, this._barWidth, this._barHeight).fill({ color: 0x333333 }); 
        }
       
       // Update fill position and redraw
       if (this._progressBarFill) { 
             this._progressBarFill.position.set(barX, this._progressBarFill.y);
             const targetWidth = this._barWidth * clampedDisplayProgress;
             this._progressBarFill.clear().rect(0, 0, targetWidth, this._barHeight).fill({ color: 0xCCCCCC });
       }
        
       // Update text position
        if (this._progressText && this._progressBarFill) { 
             this._progressText.text = `Loading ${percentage}%`;
             this._progressText.x = barX + this._barWidth / 2; // Center over the logical bar
             this._progressText.y = this._progressBarFill.y + this._barHeight + 15; 
        }
    }

    /**
     * Kills the visual animation tween if it's running.
     * @private
     */
    _killVisualTween() {
        if (this._visualTween) {
            this._visualTween.kill();
            this._visualTween = null;
        }
    }

    /**
     * Called by AssetLoader to report actual loading progress.
     * Updates actual progress and visually smoothes the bar up to 90%.
     * Triggers final animation sequence if loading completes and hide is requested.
     * @param {number} progress - The actual loading progress (0 to 1).
     */
    updateProgress(progress) {
        const newActualProgress = Math.max(0, Math.min(1, progress));
        this._actualProgress = newActualProgress;

        // Target visual progress up to 90% initially
        const targetVisualProgress = Math.min(0.9, this._actualProgress); 

        // Start/update the smoothing tween towards the capped target
        this._visualTween = gsap.to(this._visualProgressProxy, {
            value: targetVisualProgress, 
            duration: 0.5, // Standard smoothing duration
            ease: 'power1.out',
            overwrite: 'auto', 
            onUpdate: this._updateVisualBarAndText.bind(this),
            onComplete: () => {
                 // Clear tween reference only if it reached its target without being overwritten
                 if (this._visualProgressProxy.value >= targetVisualProgress) { 
                    this._visualTween = null;
                 }
                 // Ensure bar reflects the capped progress if tween completes early
                 this._updateVisualBarAndText(); 
            }
        });

        // Check if loading is complete *and* hide has been requested
        if (this._actualProgress >= 1 && this._hideRequested && !this._hideScheduled) {
             // Pass the stored promise resolution function, ONLY if it exists
             if (typeof this._resolveHidePromise === 'function') {
                 this._scheduleFinalAnimationAndHide(this._resolveHidePromise); 
                 this._resolveHidePromise = null; // Clear after use
             } else {
                  console.warn("LoadingScreen: updateProgress wanted to schedule hide, but resolveHidePromise was null.");
             }
        }
    }

    /**
     * Initiates the hide sequence.
     * Sets the hide requested flag and triggers the final animation/hide schedule if loading is already complete.
     * Returns a promise that resolves when the screen is fully hidden.
     * @returns {Promise<void>}
     */
    hide() {
        // console.log("LoadingScreen hide() called."); // Removed debug log
        return new Promise((resolve) => {
             if (!this._isVisible || this._hideRequested) {
                console.log("LoadingScreen hide() aborted: not visible or hide already requested.");
                resolve();
                return; 
            }
            
            this._hideRequested = true;
            this._resolveHidePromise = resolve; // Store for later

            // If loading is already complete when hide is called, trigger final sequence
            if (this._actualProgress >= 1 && !this._hideScheduled) {
                 // Pass the stored promise resolution function, ONLY if it exists
                 if (typeof this._resolveHidePromise === 'function') {
                     this._scheduleFinalAnimationAndHide(this._resolveHidePromise); 
                     this._resolveHidePromise = null; // Clear after use
                 } else {
                      console.warn("LoadingScreen: hide wanted to schedule hide, but resolveHidePromise was null.");
                 }
            } 
            // Else: updateProgress will trigger the final sequence when loading completes
        });
    }

    /**
     * Schedules the final 90%-100% animation and the subsequent fade-out.
     * @param {Function} resolve - The resolve function of the main hide() promise.
     * @private
     */
    _scheduleFinalAnimationAndHide(resolve) {
        if (this._hideScheduled) return;
        if (typeof resolve !== 'function') {
            // console.warn("LoadingScreen: _scheduleFinalAnimationAndHide called without a valid resolve function."); // Keep warning?
            return; 
        }
        this._hideScheduled = true;
        
        // console.log("LoadingScreen _scheduleFinalAnimationAndHide() called."); // Removed debug log

        this._killVisualTween(); // Stop the potentially running 0-90% tween

        // Animate the visual proxy from its current value to 1.0 quickly
        this._visualTween = gsap.to(this._visualProgressProxy, {
            value: 1,
            duration: this._visualProgressProxy.value < 0.99 ? 0.15 : 0, // Quick tween/snap to 100%
            ease: 'power1.out', 
            onUpdate: this._updateVisualBarAndText.bind(this),
            onComplete: () => {
                this._visualTween = null;
                this._visualProgressProxy.value = 1;
                this._updateVisualBarAndText(); // Final visual update to 100%

                // console.log(`Final animation complete at: ${performance.now()}`); // Removed debug log
                // Fade out immediately after final animation completes
                this._executeHide(resolve); // No delay
            }
        });
    }
    
    /**
     * Performs the actual fade-out animation and cleanup.
     * @param {Function} resolve - The resolve function of the main hide() promise.
     * @private
     */
    _executeHide(resolve) { // Accept resolve function
         // console.log(`LoadingScreen _executeHide called at: ${performance.now()}`); // Removed debug log
        if (!this._container) { 
            console.warn("LoadingScreen: _executeHide called but container is null.");
            resolve(); // Resolve promise even if container is gone
            return; 
        }

        this._killVisualTween(); 

        gsap.to(this._container, {
            alpha: 0,
            duration: 0.5,
            ease: 'power1.in',
            onComplete: () => {
                // console.log("LoadingScreen fade-out complete."); // Removed log completion
                if (this._container) {
                    this._container.visible = false;
                }
                this._isVisible = false;
                this._fullyVisibleStartTime = null; 
                // Reset state 
                this._actualProgress = 0; 
                this._visualProgressProxy.value = 0;
                this._hideRequested = false;
                this._hideScheduled = false;
                
                resolve(); // Resolve the main hide() promise here
            }
        });
    }
    
    /**
     * Cleans up loading screen resources.
     */
     destroy() {
        this._killVisualTween(); 
        if (this._container) {
            gsap.killTweensOf(this._container); 
            this._container.destroy({ children: true });
        }
        // Reset all properties
        this._stage = null;
        this._renderer = null;
        this._container = null;
        this._background = null;
        this._logo = null;
        this._progressBarBg = null;
        this._progressBarFill = null;
        this._progressText = null;
        this._fullyVisibleStartTime = null;
        this._actualProgress = 0;
        this._visualProgressProxy = { value: 0 };
        this._visualTween = null;
        this._hideRequested = false;
        this._hideScheduled = false;
        this._resolveHidePromise = null; // Ensure reset on destroy
        // console.log("LoadingScreen destroyed."); // Removed log
    }

    /**
     * Displays an error message on the loading screen.
     * @param {string} message - The error message to display.
     */
    showError(message) {
        if (!this._progressText || !this._container) return;

        this._killVisualTween(); 
        this._hideRequested = true; // Prevent normal hiding if error occurs
        this._hideScheduled = true; // Prevent normal hiding schedule

        this._progressText.text = `Error: ${message}`;
        this._progressText.style.fill = 0xFF4444; 
        this._progressText.alpha = 1; 

        if (this._progressBarBg) this._progressBarBg.visible = false;
        if (this._progressBarFill) this._progressBarFill.visible = false;

        // Ensure container is visible if error happens during fade-out
        this._container.alpha = 1;
        this._container.visible = true;
        this._isVisible = true;
        gsap.killTweensOf(this._container); // Stop fade-out
    }
}
