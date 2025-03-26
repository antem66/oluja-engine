import * as PIXI from 'pixi.js';
import { SYMBOL_SIZE, SYMBOLS_PER_REEL_VISIBLE, REEL_WIDTH } from '../config/gameSettings.js';
import {
    spinAcceleration, maxSpinSpeed, spinDeceleration, minSpinSpeedBeforeSnap,
    OVERSHOOT_AMOUNT, OVERSHOOT_DURATION, BOUNCE_BACK_DURATION
} from '../config/animationSettings.js'; // Import animation parameters
import { createSymbolGraphic } from './Symbol.js';
import { lerpAngle, easeOutQuad } from '../utils/helpers.js';
import { triggerNextReelStop } from './Game.js'; // Assuming Game will handle triggering next stop

export class Reel {
    constructor(reelIndex, strip, appTicker) {
        this.reelIndex = reelIndex;
        this.strip = strip;
        this.appTicker = appTicker; // Reference to the main ticker

        this.container = new PIXI.Container();
        this.container.x = reelIndex * REEL_WIDTH;

        this.symbols = []; // Array of PIXI.Container symbol graphics
        this.position = Math.random() * this.strip.length; // Current position on the strip
        this.spinSpeed = 0;
        this.state = 'idle'; // idle, accelerating, spinning, stopping, BOUNCING, stopped
        this.stopIndex = 0; // Target index on the strip to stop at
        this.finalPosition = 0; // Precise final position after bounce/snap
        this.skipBounce = false; // Controlled by TurboMode

        // Tweening properties for bounce animation
        this.isTweening = false;
        this.tweenStartTime = 0;
        this.tweenDuration = 0;
        this.tweenStartPos = 0;
        this.tweenEndPos = 0;
        this.tweenType = 'none'; // 'overshoot', 'bounce_back'

        // Blur filter
        this.blur = new PIXI.BlurFilter({ strength: 0, quality: 1, kernelSize: 5 });
        this.blur.enabled = false;
        this.container.filters = [this.blur];

        // Create initial symbols
        const numSymbolsToCreate = SYMBOLS_PER_REEL_VISIBLE + 2; // +2 for buffer top/bottom
        for (let j = 0; j < numSymbolsToCreate; j++) {
            // Start with placeholder symbols, alignReelSymbols will fix them
            const symbol = createSymbolGraphic(this.strip[0]);
            this.symbols.push(symbol);
            this.container.addChild(symbol);
        }
        this.alignReelSymbols(); // Position initial symbols correctly
    }

    // --- Reel State Control ---

    startSpinning(currentTurbo) {
        this.state = 'accelerating';
        this.spinSpeed = 0;
        this.blur.enabled = true;
        this.blur.strength = 0;
        // Determine random stop index (can be overridden by server/predetermined results later)
        this.stopIndex = Math.floor(Math.random() * this.strip.length);
        this.isTweening = false;
        this.tweenType = 'none';
        // Apply turbo setting for bounce skipping
        // this.skipBounce = currentTurbo && skipBounceInTurbo; // skipBounceInTurbo needs import or state access
        // TODO: Import or access skipBounceInTurbo from animationSettings or GameState
        this.skipBounce = currentTurbo && true; // Temporary fix
    }

    initiateStop() {
        // Only start stopping if currently spinning or accelerating
        if (this.state === 'accelerating' || this.state === 'spinning') {
            this.state = 'stopping';
            console.log(`Reel ${this.reelIndex}: Initiating stop sequence.`);
        } else {
             console.log(`Reel ${this.reelIndex}: Cannot initiate stop, state is ${this.state}.`);
        }
    }

    // --- Symbol Alignment ---

    alignReelSymbols() {
        const totalStripSymbols = this.strip.length;
        const numSymbolsInDisplay = this.symbols.length; // Should be SYMBOLS_PER_REEL_VISIBLE + 2

        for (let j = 0; j < numSymbolsInDisplay; j++) {
            const symbol = this.symbols[j];
            if (!symbol) continue; // Should not happen if initialized correctly

            // Calculate the vertical position based on the reel's current strip position
            const currentTopSymbolIndex = Math.floor(this.position) % totalStripSymbols;
            const symbolOffset = this.position - Math.floor(this.position); // How far into the current symbol we are (0-1)

            // Determine which symbol from the strip should be at this visual slot
            const targetStripIndex = (currentTopSymbolIndex + (j - 1) + totalStripSymbols) % totalStripSymbols; // (j-1) because symbols[0] is above visible area

            // Set Y position
            // (j - 1 - symbolOffset) gives the position relative to the top visible slot
            symbol.y = (j - 1 - symbolOffset) * SYMBOL_SIZE + SYMBOL_SIZE / 2; // Center symbol vertically

            // Check if the correct symbol graphic is in place, replace if not
            const expectedSymbolId = this.strip[targetStripIndex];
            if (!symbol.symbolId || symbol.symbolId !== expectedSymbolId) {
                const oldSymbolY = symbol.y; // Preserve Y position
                this.container.removeChild(symbol);
                symbol.destroy({ children: true }); // Clean up old Pixi object

                const newSymbol = createSymbolGraphic(expectedSymbolId);
                if (newSymbol) {
                    newSymbol.y = oldSymbolY;
                    newSymbol.scale.set(1); // Ensure correct scale
                    this.symbols[j] = newSymbol; // Replace in array
                    this.container.addChild(newSymbol); // Add new symbol to container
                }
                // No 'else' needed as createSymbolGraphic now always returns a Symbol instance (potentially showing an error)
            }
        }
    }

    // --- Update Logic (Called by Game Loop) ---

    update(delta, now) {
        let needsAlign = false;
        let reelIsActive = true; // Assume active unless stopped/idle

        switch (this.state) {
            case 'accelerating':
                this.spinSpeed = Math.min(maxSpinSpeed, this.spinSpeed + spinAcceleration * delta);
                this.position += this.spinSpeed * delta;
                if (this.spinSpeed >= maxSpinSpeed) this.state = 'spinning';
                this.blur.strength = (this.spinSpeed / maxSpinSpeed) * 8;
                needsAlign = true;
                break;

            case 'spinning':
                this.position += this.spinSpeed * delta;
                this.blur.strength = 8; // Max blur
                needsAlign = true;
                break;

            case 'stopping':
                // Decelerate
                this.spinSpeed *= spinDeceleration;
                this.spinSpeed = Math.max(minSpinSpeedBeforeSnap, this.spinSpeed); // Don't go below minimum speed
                this.position += this.spinSpeed * delta;
                this.blur.strength = Math.max(0, (this.spinSpeed / maxSpinSpeed) * 8); // Reduce blur with speed

                // Check if near target stop index
                const targetPosition = this.stopIndex;
                let currentPositionMod = ((this.position % this.strip.length) + this.strip.length) % this.strip.length;
                let diff = targetPosition - currentPositionMod;
                // Handle wrap-around distance calculation
                if (Math.abs(diff) > this.strip.length / 2) {
                    diff -= Math.sign(diff) * this.strip.length;
                }
                const distanceToTarget = Math.abs(diff);
                const snapThreshold = 0.05; // How close is close enough
                const speedThreshold = minSpinSpeedBeforeSnap;
                // Estimate if we'll pass the target in the next frame at current speed
                const willPassInNextFrame = distanceToTarget < this.spinSpeed * delta * 1.1; // 1.1 buffer

                if (distanceToTarget < snapThreshold || (this.spinSpeed <= speedThreshold && willPassInNextFrame)) {
                    // --- Time to Stop ---
                    this.spinSpeed = 0;
                    this.blur.strength = 0;
                    this.blur.enabled = false;

                    if (this.skipBounce) {
                        // Direct Snap to position
                        this.position = targetPosition;
                        this.state = 'stopped';
                        needsAlign = true;
                        reelIsActive = false;
                        triggerNextReelStop(this.reelIndex); // Notify Game to stop next reel
                    } else {
                        // Initiate Bounce Tween
                        this.state = 'BOUNCING';
                        this.finalPosition = targetPosition;
                        // Calculate overshoot position (wraps around strip length)
                        const overshootPosition = (this.finalPosition + OVERSHOOT_AMOUNT + this.strip.length) % this.strip.length;

                        this.isTweening = true;
                        this.tweenType = 'overshoot';
                        this.tweenStartTime = now; // Use timestamp from ticker
                        this.tweenDuration = OVERSHOOT_DURATION;
                        this.tweenStartPos = currentPositionMod; // Start from current wrapped position
                        this.tweenEndPos = overshootPosition;
                    }
                } else {
                    needsAlign = true; // Still moving, needs alignment
                }
                break;

            case 'BOUNCING':
                if (this.isTweening) {
                    const elapsed = now - this.tweenStartTime;
                    let progress = Math.min(1, elapsed / this.tweenDuration); // Clamp progress 0-1
                    progress = easeOutQuad(progress); // Apply easing

                    // Interpolate angle correctly, handling wrap-around
                    this.position = lerpAngle(this.tweenStartPos, this.tweenEndPos, progress, this.strip.length);
                    needsAlign = true;

                    if (progress === 1) { // Tween completed
                        if (this.tweenType === 'overshoot') {
                            // Setup bounce back tween
                            this.tweenType = 'bounce_back';
                            this.tweenStartTime = now;
                            this.tweenDuration = BOUNCE_BACK_DURATION;
                            this.tweenStartPos = this.position; // Start from overshoot position
                            this.tweenEndPos = this.finalPosition; // Target final stopped position
                        } else if (this.tweenType === 'bounce_back') {
                            // Bounce back finished
                            this.isTweening = false;
                            this.tweenType = 'none';
                            this.position = this.finalPosition; // Ensure exact final position
                            this.state = 'stopped';
                            needsAlign = true;
                            reelIsActive = false; // Mark as stopped
                            triggerNextReelStop(this.reelIndex); // Notify Game to stop next reel
                        }
                    }
                }
                break;

            case 'stopped':
            case 'idle':
                reelIsActive = false;
                // Ensure blur is off if somehow left enabled
                if (this.blur.enabled) {
                    this.blur.enabled = false;
                    this.blur.strength = 0;
                }
                break;
        } // End Switch

        // Normalize position and align symbols if needed
        if (needsAlign) {
            this.position = ((this.position % this.strip.length) + this.strip.length) % this.strip.length;
            this.alignReelSymbols();
        }

        return reelIsActive; // Return whether the reel is still considered moving/active
    }
}
