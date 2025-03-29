import * as PIXI from 'pixi.js';
import { gsap } from 'gsap'; // Import GSAP
import { SYMBOL_SIZE, SYMBOLS_PER_REEL_VISIBLE, REEL_WIDTH } from '../config/gameSettings.js';
import {
    spinAcceleration, maxSpinSpeed,
    stopTweenDuration // Import new setting
} from '../config/animationSettings.js'; // Import animation parameters
import { createSymbolGraphic } from './Symbol.js'; // Restore this import

export class Reel {
    reelIndex;
    strip;
    appTicker;
    container;
    symbols = []; // Restore symbols array
    position = 0; // Logical position on the strip (index)
    spinSpeed = 0;
    state = 'idle';
    stopIndex = 0;
    finalStopPosition = 0;
    targetStopTime = 0;
    /** @type {gsap.core.Tween | null} */
    stopTween = null; // Reference to the GSAP tween
    /** @type {PIXI.BlurFilter} */
    motionBlur;
    /** @type {PIXI.ColorMatrixFilter} */
    colorMatrix;
    shimmerContainer;
    lightStreaks;

    constructor(reelIndex, strip, appTicker) {
        this.reelIndex = reelIndex;
        this.strip = strip;
        this.appTicker = appTicker;

        this.container = new PIXI.Container();
        this.container.x = reelIndex * REEL_WIDTH;

        this.symbols = []; // Initialize symbols array
        this.position = Math.random() * this.strip.length;
        this.stopIndex = Math.floor(this.position);
        this.finalStopPosition = this.stopIndex;

        this.setupSpinEffects();

        // Create initial symbols
        const numSymbolsToCreate = SYMBOLS_PER_REEL_VISIBLE + 2;
        for (let j = 0; j < numSymbolsToCreate; j++) {
            // Use placeholder initially, alignReelSymbols will fix it
            const symbol = createSymbolGraphic(this.strip[0]);
            this.symbols.push(symbol);
            this.container.addChild(symbol);
        }
        this.alignReelSymbols(); // Position initial symbols correctly
    }

    /**
     * Set up enhanced visual effects for spinning animation
     */
    setupSpinEffects() {
        // @ts-ignore
        this.motionBlur = new PIXI.BlurFilter();
        this.motionBlur.blurY = 0;
        this.motionBlur.blurX = 0;
        this.motionBlur.quality = 2;
        this.motionBlur.enabled = false;

        // @ts-ignore
        this.colorMatrix = new PIXI.ColorMatrixFilter();
        this.colorMatrix.enabled = false;

        this.container.filters = [this.motionBlur, this.colorMatrix];

        this.setupShimmerEffect();
    }

    /**
     * Create light streak elements for a shimmer effect during spinning
     */
    setupShimmerEffect() {
        this.shimmerContainer = new PIXI.Container();
        this.container.addChild(this.shimmerContainer);
        this.lightStreaks = [];
        const numStreaks = 3;
        for (let i = 0; i < numStreaks; i++) {
            const streak = new PIXI.Graphics();
            streak.alpha = 0;
            streak.beginFill(0xffffff, 1);
            streak.drawRect(-5, -SYMBOL_SIZE * 3, 10, SYMBOL_SIZE * 6);
            streak.endFill();
            streak.pivot.set(0, 0);
            streak.rotation = -Math.PI / 4;
            streak.y = SYMBOL_SIZE * (Math.random() * SYMBOLS_PER_REEL_VISIBLE);
            this.shimmerContainer.addChild(streak);
            this.lightStreaks.push(streak);
        }
        this.shimmerContainer.visible = false;
    }

    // --- Reel State Control ---

    startSpinning(currentTurbo) {
        // No check for reelSprite needed now
        this.state = 'accelerating';
        this.spinSpeed = 0;

        if (this.motionBlur) this.motionBlur.enabled = true;
        if (this.colorMatrix) this.colorMatrix.enabled = true;
        if (this.shimmerContainer) this.shimmerContainer.visible = true;

        // Stop index determination is not strictly needed for infinite spin test
        // this.stopIndex = Math.floor(Math.random() * this.strip.length);
        // this.finalStopPosition = this.stopIndex;
        this.targetStopTime = 0; // Ensure no stop is scheduled
        if (this.stopTween) {
            this.stopTween.kill();
            this.stopTween = null;
        }
        console.log(`Reel ${this.reelIndex}: Starting spin (infinite test)`);
    }

    scheduleStop(targetStopTime) {
        this.targetStopTime = targetStopTime; // Uncommented to store stop time
        console.log(`Reel ${this.reelIndex}: Scheduled to stop near time ${targetStopTime.toFixed(0)}`);
    }

    // --- Symbol Alignment --- (Restored)

    alignReelSymbols() {
        const totalStripSymbols = this.strip.length;
        const numSymbolsInDisplay = this.symbols.length;
        const currentPosition = this.position;

        const topVisibleStripIndex = Math.floor(currentPosition) % totalStripSymbols;

        for (let i = 0; i < numSymbolsInDisplay; i++) {
            const symbolSprite = this.symbols[i];
            if (!symbolSprite) continue;

            const relativeIndex = i - 1;
            const targetStripIndex = (topVisibleStripIndex + relativeIndex + totalStripSymbols) % totalStripSymbols;

            const symbolOffset = currentPosition - Math.floor(currentPosition);
            symbolSprite.y = (relativeIndex - symbolOffset) * SYMBOL_SIZE + (SYMBOL_SIZE / 2);
            console.log(`Reel ${this.reelIndex}, Symbol ${i}, Y: ${symbolSprite.y.toFixed(2)}, Pos: ${currentPosition.toFixed(2)}`); // ADD THIS LOG

            // --- Uncommented Symbol Replacement Logic ---
            const expectedSymbolId = this.strip[targetStripIndex];

            // *** ADDED CHECK ***: Ensure expectedSymbolId is valid before proceeding
            if (typeof expectedSymbolId !== 'string' || expectedSymbolId === '') {
                console.error(`[Reel ${this.reelIndex}] Invalid expectedSymbolId at index ${targetStripIndex}. Skipping replacement for symbol ${i}.`);
                // Ensure the current symbol is not null before skipping
                if (!symbolSprite) this.symbols[i] = null; // Keep it null if it was already
                continue; // Skip to the next symbol in the loop
            }

            // Ensure symbolSprite has a property like 'symbolId' for comparison
            // Assuming createSymbolGraphic adds this property.
            // @ts-ignore - Add check if symbolSprite has symbolId property before comparing
            if (symbolSprite && typeof symbolSprite.symbolId !== 'undefined' && symbolSprite.symbolId !== expectedSymbolId) {
                const oldSymbolY = symbolSprite.y;

                // Important: Remove child *before* destroying
                this.container.removeChild(symbolSprite);
                symbolSprite.destroy({ children: true }); // Ensure proper cleanup

                const newSymbol = createSymbolGraphic(expectedSymbolId);
                if (newSymbol) {
                    // Assign symbolId if createSymbolGraphic doesn't
                    // newSymbol.symbolId = expectedSymbolId; 
                    this.symbols[i] = newSymbol;
                    this.container.addChildAt(newSymbol, i); // Use addChildAt for order
                    newSymbol.y = oldSymbolY;
                } else {
                    console.error(`Failed to create symbol graphic for ID: ${expectedSymbolId}`);
                    // Handle error: maybe push a placeholder or skip?
                    // For now, push null to avoid errors down the line, but log it
                    this.symbols[i] = null;
                    console.warn(`Pushed null to symbols array at index ${i} for reel ${this.reelIndex}`);
                }
            } else if (symbolSprite && typeof symbolSprite.symbolId === 'undefined') {
                 console.warn(`Symbol sprite at index ${i} on reel ${this.reelIndex} is missing symbolId property.`);
            }
        }
    }

    /**
     * Updates the visual effects based on spin speed
     */
    updateSpinEffects(normalizedSpeed) {
        // Logic remains the same
        if (normalizedSpeed <= 0) {
            if (this.motionBlur) this.motionBlur.enabled = false;
            if (this.colorMatrix) this.colorMatrix.enabled = false;
            if (this.shimmerContainer) this.shimmerContainer.visible = false;
            return;
        }
        if (this.motionBlur) {
            this.motionBlur.enabled = true;
            this.motionBlur.blurY = 12 * normalizedSpeed;
        }
        if (this.colorMatrix) {
            this.colorMatrix.enabled = true;
            this.colorMatrix.reset();
            this.colorMatrix.brightness(1 + 0.2 * normalizedSpeed, false);
            this.colorMatrix.contrast(1 + 0.1 * normalizedSpeed, false);
        }
        this.updateShimmerEffect(normalizedSpeed);
    }

    /**
     * Update shimmer light streaks animation
     */
    updateShimmerEffect(normalizedSpeed) {
        // Logic remains the same
        if (normalizedSpeed < 0.5 || !this.shimmerContainer || !this.lightStreaks) {
             if (this.shimmerContainer) this.shimmerContainer.visible = false;
             return;
        }
        this.shimmerContainer.visible = true;
        const chanceToShow = normalizedSpeed * 0.02;
        this.lightStreaks.forEach(streak => {
            if (!streak) return;
            if (streak.alpha <= 0.1 && Math.random() < chanceToShow) {
                streak.y = SYMBOL_SIZE * (Math.random() * SYMBOLS_PER_REEL_VISIBLE);
                gsap.killTweensOf(streak);
                gsap.to(streak, { alpha: 0.7 * normalizedSpeed, duration: 0.1, onComplete: () => {
                    gsap.to(streak, { alpha: 0, duration: 0.3, ease: "power1.out" });
                }});
            }
        });
    }

    // --- Update Logic (Simplified for Infinite Spin Test) ---

    update(delta, now) {
        let needsAlign = false;
        let reelIsActive = true; // Restore variable declaration

        // --- State Machine with Stop Logic ---
        switch (this.state) {
            case 'accelerating':
                this.spinSpeed = Math.min(maxSpinSpeed, this.spinSpeed + spinAcceleration * delta);
                this.position += this.spinSpeed * delta;
                if (this.spinSpeed >= maxSpinSpeed) {
                    this.state = 'spinning';
                    this.spinSpeed = maxSpinSpeed;
                }
                this.updateSpinEffects(this.spinSpeed / maxSpinSpeed);
                needsAlign = true;
                break;

            case 'spinning':
                // Check if it's time to initiate the stop tween
                if (this.targetStopTime > 0 && now >= this.targetStopTime - stopTweenDuration) {
                    this.state = 'tweeningStop';
                    this.spinSpeed = 0; // Stop natural spinning
                    console.log(`Reel ${this.reelIndex}: Initiating stop tween at time ${now.toFixed(0)}`);

                    // *** DEBUG LOG ***: Check finalStopPosition before tweening
                    if (isNaN(this.finalStopPosition)) {
                        console.error(`[Reel ${this.reelIndex}] *** ERROR: finalStopPosition is NaN before tween start!`);
                    } else {
                        console.log(`[Reel ${this.reelIndex}] finalStopPosition before tween: ${this.finalStopPosition}`);
                    }

                    // Kill any previous tween just in case
                    if (this.stopTween) {
                        this.stopTween.kill();
                    }

                    // Create the GSAP tween to stop the reel
                    this.stopTween = gsap.to(this, {
                        position: this.finalStopPosition, // Target the final logical position
                        duration: stopTweenDuration / 1000, // GSAP uses seconds
                        ease: 'quad.out', // Smooth deceleration
                        onUpdate: () => {
                            // Update visuals during the tween
                            this.position = ((this.position % this.strip.length) + this.strip.length) % this.strip.length; // Wrap position during tween
                            this.alignReelSymbols();
                            // Gradually reduce spin effects during tween
                            const progress = this.stopTween ? this.stopTween.progress() : 1;
                            this.updateSpinEffects(1 - progress);
                        },
                        onComplete: () => {
                            console.log(`Reel ${this.reelIndex}: Stop tween completed at time ${performance.now().toFixed(0)}`);
                            this.state = 'stopped';
                            this.position = this.finalStopPosition; // Ensure exact final position
                            this.stopTween = null;
                            this.updateSpinEffects(0); // Turn off effects completely
                            this.alignReelSymbols(); // Align one last time
                        }
                    });
                    // Tween started, no need for natural position update this frame
                    needsAlign = false; // onUpdate will handle alignment
                } else {
                    // Continue spinning normally
                    this.position += maxSpinSpeed * delta;
                    this.updateSpinEffects(1.0);
                    needsAlign = true;
                }
                break;

            // Uncomment and adjust tweeningStop case
            case 'tweeningStop':
                // GSAP tween handles position updates via onUpdate.
                // The onUpdate callback now sets needsAlign = true implicitly by calling alignReelSymbols.
                // We just need to check if the tween is still active.
                reelIsActive = this.stopTween ? this.stopTween.isActive() : false;
                if (!reelIsActive) {
                    // Fallback if tween completed but onComplete didn't run or state didn't change
                    console.warn(`Reel ${this.reelIndex}: Tween stopped unexpectedly or onComplete failed. Forcing state to 'stopped'.`);
                    this.state = 'stopped';
                    this.position = this.finalStopPosition; // Snap logical position
                    this.updateSpinEffects(0);
                    this.alignReelSymbols(); // Align one last time
                }
                // No need to set needsAlign here, onUpdate handles it.
                break;

            case 'stopped': // Restore correct stopped/idle behavior
            case 'idle':
                reelIsActive = false; // Reel is not active
                this.updateSpinEffects(0); // Ensure effects are off
                // Do not change position or set needsAlign
              break;         }

         // Align symbols if needed (and wrap position)
         if (needsAlign) {
              this.position = ((this.position % this.strip.length) + this.strip.length) % this.strip.length;
              this.alignReelSymbols();
         }

         return reelIsActive; // Restore returning the actual state activity
     }
 }
