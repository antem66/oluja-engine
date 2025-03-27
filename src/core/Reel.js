import * as PIXI from 'pixi.js';
import { gsap } from 'gsap'; // Import GSAP
import { SYMBOL_SIZE, SYMBOLS_PER_REEL_VISIBLE, REEL_WIDTH } from '../config/gameSettings.js';
import {
    spinAcceleration, maxSpinSpeed,
    stopTweenDuration // Import new setting
} from '../config/animationSettings.js'; // Import animation parameters
import { createSymbolGraphic } from './Symbol.js';
// Remove unused helpers: import { lerpAngle, easeOutQuad } from '../utils/helpers.js';

export class Reel {
    constructor(reelIndex, strip, appTicker) {
        this.reelIndex = reelIndex;
        this.strip = strip;
        this.appTicker = appTicker; // Keep ticker reference if needed for 'now'

        this.container = new PIXI.Container();
        this.container.x = reelIndex * REEL_WIDTH;

        this.symbols = []; // Array of PIXI.Container symbol graphics
        this.position = Math.random() * this.strip.length; // Current position on the strip
        this.spinSpeed = 0;
        this.state = 'idle'; // idle, accelerating, spinning, tweeningStop, stopped
        this.stopIndex = 0; // Target index on the strip to stop at
        this.finalStopPosition = 0; // Store the target stop index as final position

        // Properties for scheduled stop tweening
        this.targetStopTime = 0; // Absolute time when the reel should finish stopping
        this.stopTween = null; // Reference to the GSAP tween

        // Enhanced visual effects for spinning
        this.setupSpinEffects();

        // Create initial symbols
        const numSymbolsToCreate = SYMBOLS_PER_REEL_VISIBLE + 2; // +2 for buffer top/bottom
        for (let j = 0; j < numSymbolsToCreate; j++) {
            const symbol = createSymbolGraphic(this.strip[0]); // Start with placeholder
            this.symbols.push(symbol);
            this.container.addChild(symbol);
        }
        this.alignReelSymbols(); // Position initial symbols correctly
    }

    /**
     * Set up enhanced visual effects for spinning animation
     */
    setupSpinEffects() {
        // 1. Motion Blur Filter (improved version of original blur)
        this.motionBlur = new PIXI.BlurFilter();
        this.motionBlur.blurY = 0;
        this.motionBlur.blurX = 0;
        this.motionBlur.quality = 2;
        this.motionBlur.enabled = false;
        
        // 2. Color Matrix Filter for brightness/contrast adjustments during spins
        // this.colorMatrix = new PIXI.ColorMatrixFilter();
        // this.colorMatrix.enabled = false;
        
        // Apply filters to container
        this.container.filters = [this.motionBlur];
        
        // Setup shimmer effect elements (light streaks)
        this.setupShimmerEffect();
    }
    
    /**
     * Create light streak elements for a shimmer effect during spinning
     */
    setupShimmerEffect() {
        // Create shimmer container
        this.shimmerContainer = new PIXI.Container();
        this.container.addChild(this.shimmerContainer);
        
        // Create several diagonal light streaks
        this.lightStreaks = [];
        const numStreaks = 3;
        
        for (let i = 0; i < numStreaks; i++) {
            const streak = new PIXI.Graphics();
            streak.alpha = 0;
            
            // Draw diagonal light streak
            streak.beginFill(0xffffff, 1);
            streak.drawRect(-5, -SYMBOL_SIZE * 3, 10, SYMBOL_SIZE * 6);
            streak.endFill();
            
            // Rotate and position
            streak.pivot.set(0, 0);
            streak.rotation = -Math.PI / 4; // Diagonal angle
            streak.y = SYMBOL_SIZE * (Math.random() * SYMBOLS_PER_REEL_VISIBLE);
            
            this.shimmerContainer.addChild(streak);
            this.lightStreaks.push(streak);
        }
        
        // Hide shimmer container initially
        this.shimmerContainer.visible = false;
    }

    // --- Reel State Control ---

    startSpinning(currentTurbo) {
        this.state = 'accelerating';
        this.spinSpeed = 0; // Start from 0 speed
        
        // Enable and reset all visual effects
        if (this.motionBlur) {
            this.motionBlur.enabled = true;
            this.motionBlur.blurY = 0;
            this.motionBlur.blurX = 0;
        }
        
        if (this.colorMatrix) {
            this.colorMatrix.enabled = true;
            this.colorMatrix.reset(); // Reset to identity matrix
        }
        
        // Show shimmer container and reset streaks
        if (this.shimmerContainer) {
            this.shimmerContainer.visible = true;
            
            if (this.lightStreaks) {
                this.lightStreaks.forEach(streak => {
                    if (streak) {
                        streak.alpha = 0;
                        streak.y = SYMBOL_SIZE * (Math.random() * SYMBOLS_PER_REEL_VISIBLE);
                    }
                });
            }
        }
        
        // Determine random stop index (can be overridden by server/predetermined results later)
        this.stopIndex = Math.floor(Math.random() * this.strip.length);
        this.finalStopPosition = this.stopIndex; // Store the target index
        this.targetStopTime = 0; // Reset target stop time
        if (this.stopTween) { // Kill any previous stop tween
            this.stopTween.kill();
            this.stopTween = null;
        }
        console.log(`Reel ${this.reelIndex}: Starting spin, target stop index: ${this.stopIndex}`);
    }

    // New method to schedule the stop
    scheduleStop(targetStopTime) {
        this.targetStopTime = targetStopTime;
        // The actual transition to tweening will happen in the update loop based on time
    }

    // --- Symbol Alignment ---

    alignReelSymbols() {
        const totalStripSymbols = this.strip.length;
        const numSymbolsInDisplay = this.symbols.length; // e.g., 6 (SYMBOLS_PER_REEL_VISIBLE + 2)
        const currentPosition = this.position; // Use the current reel position

        // Calculate the index of the symbol strip that should be at the *very top* of the visible area
        // Adjusting for the buffer symbol at the top.
        const topVisibleStripIndex = Math.floor(currentPosition) % totalStripSymbols;

        for (let i = 0; i < numSymbolsInDisplay; i++) {
            const symbolSprite = this.symbols[i];
            if (!symbolSprite) continue; // Should not happen if initialized correctly

            // Calculate the target strip index for this sprite slot (i)
            // Index 0 is buffer above, 1 is top visible, ..., numSymbolsInDisplay-1 is buffer below
            // Relative index from the top visible symbol on the strip
            const relativeIndex = i - 1; // -1 for top buffer, 0 for top visible, etc.
            const targetStripIndex = (topVisibleStripIndex + relativeIndex + totalStripSymbols) % totalStripSymbols;

            // Calculate the Y position based on the current reel position (fractional part determines offset)
            const symbolOffset = currentPosition - Math.floor(currentPosition);
            // Position relative to the container's top edge. Anchor is 0.5.
            symbolSprite.y = (relativeIndex - symbolOffset) * SYMBOL_SIZE + (SYMBOL_SIZE / 2);

            const expectedSymbolId = this.strip[targetStripIndex];

            // If the sprite doesn't exist, or its ID doesn't match the expected one, replace it
            if (symbolSprite.symbolId !== expectedSymbolId) {
                const oldSymbolY = symbolSprite.y; // Store Y before removing
                this.container.removeChild(symbolSprite);
                symbolSprite.destroy(); // Destroy the old sprite

                const newSymbol = createSymbolGraphic(expectedSymbolId); // Returns SymbolSprite
                if (newSymbol) {
                    newSymbol.y = oldSymbolY; // Apply stored Y position
                    this.symbols[i] = newSymbol; // Replace in array
                    this.container.addChild(newSymbol); // Add new sprite to container
                } else {
                    // Handle error if symbol creation fails
                    console.error(`Failed to create symbol graphic for ID: ${expectedSymbolId}`);
                }
            }
        }
    }

    /**
     * Updates the visual effects based on spin speed
     * @param {number} normalizedSpeed - Speed value from 0-1
     */
    updateSpinEffects(normalizedSpeed) {
        if (normalizedSpeed <= 0) {
            // Disable all effects when not spinning
            if (this.motionBlur) {
                this.motionBlur.enabled = false;
            }
            if (this.colorMatrix) {
                this.colorMatrix.enabled = false;
            }
            if (this.shimmerContainer) {
                this.shimmerContainer.visible = false;
            }
            return;
        }
        
        // 1. Update motion blur
        if (this.motionBlur) {
            this.motionBlur.enabled = true;
            this.motionBlur.blurY = 12 * normalizedSpeed;
        }
        
        // 2. Update color matrix effects
        if (this.colorMatrix) {
            this.colorMatrix.enabled = true;
            this.colorMatrix.reset();
            
            // Add brightness and contrast adjustments
            this.colorMatrix.brightness(1 + 0.2 * normalizedSpeed, false);
            this.colorMatrix.contrast(1 + 0.1 * normalizedSpeed, false);
        }
        
        // 3. Animate light streaks
        this.updateShimmerEffect(normalizedSpeed);
    }
    
    /**
     * Update shimmer light streaks animation
     * @param {number} normalizedSpeed - Speed value from 0-1
     */
    updateShimmerEffect(normalizedSpeed) {
        // Only show streaks at higher speeds
        if (normalizedSpeed < 0.5 || !this.shimmerContainer || !this.lightStreaks) {
            if (this.shimmerContainer) {
                this.shimmerContainer.visible = false;
            }
            return;
        }
        
        this.shimmerContainer.visible = true;
        
        // Randomly trigger streaks based on speed
        const chanceToShow = normalizedSpeed * 0.02;
        
        this.lightStreaks.forEach(streak => {
            if (!streak) return;
            
            // If streak is not visible, randomly make it appear
            if (streak.alpha <= 0.1 && Math.random() < chanceToShow) {
                // Reset position and animate it
                streak.y = SYMBOL_SIZE * (Math.random() * SYMBOLS_PER_REEL_VISIBLE);
                
                // Create quick fade in/out animation
                gsap.killTweensOf(streak);
                gsap.to(streak, {
                    alpha: 0.7 * normalizedSpeed,
                    duration: 0.1,
                    onComplete: () => {
                        gsap.to(streak, {
                            alpha: 0,
                            duration: 0.3,
                            ease: "power1.out"
                        });
                    }
                });
            }
        });
    }

    // --- Update Logic (Called by Game Loop) ---

    update(delta, now) { // 'now' is the current time from the ticker (performance.now() or similar)
        let needsAlign = false;
        let reelIsActive = true; // Assume active unless stopped/idle

        // Check if it's time to start the stop tween
        if ((this.state === 'accelerating' || this.state === 'spinning') && this.targetStopTime > 0 && now >= this.targetStopTime - stopTweenDuration && !this.stopTween) {
            this.state = 'tweeningStop';
            this.spinSpeed = 0; // Stop applying manual speed changes
            
            // Begin disabling visual effects
            this.updateSpinEffects(0.3); // Start with reduced effects

            // Ensure position is wrapped correctly before starting tween
            const currentPosition = ((this.position % this.strip.length) + this.strip.length) % this.strip.length;
            let targetPosition = this.finalStopPosition;

            // Handle wrap-around for GSAP tweening
            // If the target is just past the wrap point (e.g., target 1, current 15, length 16), add strip.length
            if (Math.abs(targetPosition - currentPosition) > this.strip.length / 2) {
                if (targetPosition < currentPosition) {
                    targetPosition += this.strip.length;
                }
            }

            console.log(`Reel ${this.reelIndex}: Starting GSAP stop tween from ${currentPosition.toFixed(2)} to ${targetPosition.toFixed(2)} at ${now.toFixed(0)}ms`);

            // Create a timeline for smoother animation sequence
            const tl = gsap.timeline();
            
            // First tween: position with simultaneous effects reduction
            tl.to(this, {
                position: targetPosition,
                duration: stopTweenDuration / 1000, // GSAP uses seconds
                ease: 'quad.out', // Use GSAP's easing functions
                onUpdate: () => {
                    needsAlign = true; // Align symbols during tween
                    
                    // Calculate progress of the tween (0 to 1)
                    const progress = 1 - (tl.progress() || 0);
                    
                    // Update visual effects with fading intensity
                    this.updateSpinEffects(progress * 0.3); // Gradually reduce from 0.3 to 0
                },
                onComplete: () => {
                    this.position = this.finalStopPosition; // Ensure exact final position
                    this.state = 'stopped';
                    this.alignReelSymbols();
                    needsAlign = false; // Alignment is done
                    reelIsActive = false; // Mark as stopped
                    
                    // Ensure all effects are disabled
                    this.updateSpinEffects(0);
                    
                    this.stopTween = null; // Clear tween reference
                    console.log(`Reel ${this.reelIndex}: GSAP tween stopped at ${performance.now().toFixed(0)}ms`);
                }
            });
            
            // Store the timeline
            this.stopTween = tl;
        }

        switch (this.state) {
            case 'accelerating':
                this.spinSpeed = Math.min(maxSpinSpeed, this.spinSpeed + spinAcceleration * delta);
                this.position += this.spinSpeed * delta;
                if (this.spinSpeed >= maxSpinSpeed) {
                    this.state = 'spinning';
                    this.spinSpeed = maxSpinSpeed; // Cap speed
                }
                
                // Update visual effects with normalized speed (0-1)
                const normalizedSpeed = this.spinSpeed / maxSpinSpeed;
                this.updateSpinEffects(normalizedSpeed);
                
                needsAlign = true;
                break;

            case 'spinning':
                // Continue spinning at max speed
                this.position += maxSpinSpeed * delta;
                
                // Update visual effects at full intensity
                this.updateSpinEffects(1.0);
                
                needsAlign = true;
                break;

            case 'tweeningStop':
                // GSAP is handling the position update via the tween's onUpdate
                // We just need to ensure symbols are aligned
                if (this.stopTween) { // If tween is active
                    needsAlign = true; // Ensure alignment happens
                } else {
                    // If tween finished unexpectedly or was killed, force state to stopped
                    this.state = 'stopped';
                    this.position = this.finalStopPosition; // Snap to final position
                    needsAlign = true;
                    reelIsActive = false;
                    
                    // Ensure all effects are disabled
                    this.updateSpinEffects(0);
                    
                    console.warn(`Reel ${this.reelIndex}: Tween finished unexpectedly.`);
                }
                break;
                
            case 'stopped':
            case 'idle':
                reelIsActive = false;
                
                // Ensure all effects are disabled
                this.updateSpinEffects(0);
                break;
        } // End Switch

        // Normalize position and align symbols if needed
        if (needsAlign) {
            // Wrap position around strip length
            this.position = ((this.position % this.strip.length) + this.strip.length) % this.strip.length;
            this.alignReelSymbols();
        }

        return reelIsActive; // Return whether the reel is still considered moving/active
    }
}
