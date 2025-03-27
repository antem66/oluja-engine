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

        // Blur filter
        this.blur = new PIXI.BlurFilter({ strength: 0, quality: 1, kernelSize: 5 });
        this.blur.enabled = false;
        this.container.filters = [this.blur];

        // Create initial symbols
        const numSymbolsToCreate = SYMBOLS_PER_REEL_VISIBLE + 2; // +2 for buffer top/bottom
        for (let j = 0; j < numSymbolsToCreate; j++) {
            const symbol = createSymbolGraphic(this.strip[0]); // Start with placeholder
            this.symbols.push(symbol);
            this.container.addChild(symbol);
        }
        this.alignReelSymbols(); // Position initial symbols correctly
    }

    // --- Reel State Control ---

    startSpinning(currentTurbo) {
        this.state = 'accelerating';
        this.spinSpeed = 0; // Start from 0 speed
        this.blur.enabled = true;
        this.blur.strength = 0;
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
                    // this.symbols[i] = undefined; // Don't assign undefined, let the check at loop start handle it
                    console.error(`Failed to create symbol graphic for ID: ${expectedSymbolId}`);
                }
            }
        }
    }

    // --- Update Logic (Called by Game Loop) ---

    update(delta, now) { // 'now' is the current time from the ticker (performance.now() or similar)
        let needsAlign = false;
        let reelIsActive = true; // Assume active unless stopped/idle

        // Check if it's time to start the stop tween
        if ((this.state === 'accelerating' || this.state === 'spinning') && this.targetStopTime > 0 && now >= this.targetStopTime - stopTweenDuration && !this.stopTween) {
            this.state = 'tweeningStop';
            this.spinSpeed = 0; // Stop applying manual speed changes
            this.blur.strength = 0;
            this.blur.enabled = false;

            // Ensure position is wrapped correctly before starting tween
            const currentPosition = ((this.position % this.strip.length) + this.strip.length) % this.strip.length;
            let targetPosition = this.finalStopPosition;

            // Handle wrap-around for GSAP tweening
            // If the target is just past the wrap point (e.g., target 1, current 15, length 16), add strip.length
            if (Math.abs(targetPosition - currentPosition) > this.strip.length / 2) {
                if (targetPosition < currentPosition) {
                    targetPosition += this.strip.length;
                } else {
                    // This case might be less common if spinning forward, but handle anyway
                    // targetPosition -= this.strip.length; // Or adjust currentPosition instead?
                    // Let's assume forward spin, target is usually ahead or slightly behind after wrap
                }
            }

            console.log(`Reel ${this.reelIndex}: Starting GSAP stop tween from ${currentPosition.toFixed(2)} to ${targetPosition.toFixed(2)} at ${now.toFixed(0)}ms`);

            this.stopTween = gsap.to(this, {
                position: targetPosition,
                duration: stopTweenDuration / 1000, // GSAP uses seconds
                ease: 'quad.out', // Use GSAP's easing functions
                onUpdate: () => {
                    needsAlign = true; // Align symbols during tween
                },
                onComplete: () => {
                    this.position = this.finalStopPosition; // Ensure exact final position
                    this.state = 'stopped';
                    this.alignReelSymbols(); // <<<=== FINAL ALIGNMENT CALL
                    needsAlign = false; // Alignment is done
                    reelIsActive = false; // Mark as stopped
                    this.stopTween = null; // Clear tween reference
                    console.log(`Reel ${this.reelIndex}: GSAP tween stopped at ${performance.now().toFixed(0)}ms`);
                }
            });
        }

        switch (this.state) {
            case 'accelerating':
                this.spinSpeed = Math.min(maxSpinSpeed, this.spinSpeed + spinAcceleration * delta);
                this.position += this.spinSpeed * delta;
                if (this.spinSpeed >= maxSpinSpeed) {
                    this.state = 'spinning';
                    this.spinSpeed = maxSpinSpeed; // Cap speed
                }
                this.blur.strength = (this.spinSpeed / maxSpinSpeed) * 8;
                needsAlign = true;
                break;

            case 'spinning':
                // Continue spinning at max speed
                this.position += maxSpinSpeed * delta;
                this.blur.strength = 8; // Max blur
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
                    console.warn(`Reel ${this.reelIndex}: Tween finished unexpectedly.`);
                    // } // Remove the redundant if check
                }
                break;
            // Removed duplicated block here
            case 'stopped':
            case 'idle':
                reelIsActive = false;
                // Ensure blur is off
                if (this.blur.enabled) {
                    this.blur.enabled = false;
                    this.blur.strength = 0;
                }
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
