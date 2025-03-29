import * as PIXI from 'pixi.js';
import { gsap } from 'gsap'; // Import GSAP
import { winAnimDelayMultiplier } from '../config/animationSettings.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameSettings.js';

// Reference to the overlay container (needs initialization)
/** @type {PIXI.Container | null} */
let overlayContainer = null;
/** @type {gsap.core.Timeline | null} */
let currentOverlayTween = null; // To manage GSAP tween
/** @type {any} */
let flashElementInterval = null; // Store interval ID for flashing
/** @type {PIXI.Text | null} */
let currentMessageText = null; // Keep track of the current message display object

/**
 * Initializes the reference to the overlay container.
 * @param {PIXI.Container} container - The Pixi container for overlay messages.
 */
export function initNotifications(container) {
    if (!container) {
        console.error("Notifications: Provided overlay container is invalid.");
        return;
    }
    overlayContainer = container;
    console.log("Notifications initialized with container:", overlayContainer);
}

/**
 * Flashes a PixiJS display object (like Text) with a specific color.
 * @param {PIXI.Container} element - The Pixi element to flash (Container is a common base).
 * @param {number} [flashColor=0xff0000] - The color to flash (hex).
 * @param {number} [baseDuration=150] - Base duration of each flash phase (ms).
 * @param {number} [flashes=2] - Number of full on/off cycles.
 */
export function flashElement(
  element,
  flashColor = 0xff0000,
  baseDuration = 150,
  flashes = 2
) {
  if (flashElementInterval !== null) clearInterval(flashElementInterval);
  if (!element?.parent) return; // Don't flash if element isn't on stage

  const originalTint = element.tint ?? 0xffffff;
  let count = 0;
  element.visible = true; // Ensure it's visible

  const duration = baseDuration * winAnimDelayMultiplier; // Adjust duration based on turbo

  function doFlash() {
    if (!element?.parent) { // Stop if element is removed
        if (flashElementInterval !== null) clearInterval(flashElementInterval);
        return;
    }
    if (count >= flashes * 2) { // Completed all flashes
        if (flashElementInterval !== null) clearInterval(flashElementInterval);
        element.tint = originalTint; // Restore original tint
        return;
    }
    // Alternate between flash color and original tint
    element.tint = count % 2 === 0 ? flashColor : originalTint;
    count++;
  }

  doFlash(); // Start immediately
  // Assign return value directly
  flashElementInterval = setInterval(doFlash, duration);
}

/**
 * Displays a temporary message centered on the screen in the overlay container.
 * @param {string} message - The text message to display (use \n for newlines).
 * @param {number} baseDuration - Base duration to display the message (ms) before fading.
 * @param {function} [callback] - Optional function to call after the message disappears.
 */
export function showOverlayMessage(message, baseDuration, callback) {
  if (!overlayContainer) {
      console.error("Notifications: Overlay container not initialized.");
      return;
  }

  // --- Clean up previous message --- START
  // Kill previous tween if running
  if (currentOverlayTween) {
      currentOverlayTween.kill();
      currentOverlayTween = null;
  }
  // Remove previous message text if it exists
  if (currentMessageText) {
      if (currentMessageText.parent && overlayContainer) {
          overlayContainer.removeChild(currentMessageText);
      }
      currentMessageText.destroy();
      currentMessageText = null;
  }
  // REMOVED: overlayContainer.removeChildren(); // DO NOT clear the entire layer
  // --- Clean up previous message --- END

  // Create style for overlay message text
  const style = new PIXI.TextStyle({
    fontFamily: 'Arial, sans-serif',
    fontSize: 28,
    fontWeight: 'bold',
    fill: 0xFFFFFF, // Single color instead of gradient
    stroke: { color: 0x000000, width: 4 },
    align: 'center',
    wordWrap: true,
    wordWrapWidth: GAME_WIDTH * 0.8
  });

  // Create the new message text and store it
  const newMessageText = new PIXI.Text({
    text: message,
    style: style,
  });
  newMessageText.anchor.set(0.5);
  newMessageText.x = GAME_WIDTH / 2;
  newMessageText.y = GAME_HEIGHT / 2;
  newMessageText.alpha = 0; // Start invisible

  currentMessageText = newMessageText; // Store reference to the new message
  if (overlayContainer) {
    overlayContainer.addChild(currentMessageText); // Add the new message
  }

  // Use GSAP for fade in, hold, and fade out
  const displayDurationSeconds = (baseDuration / 1000) * winAnimDelayMultiplier;
  const fadeDurationSeconds = 0.3 * winAnimDelayMultiplier; // Quick fade

  // Create the new timeline
  const timeline = gsap.timeline({
      onComplete: () => {
          // Ensure we are removing the *correct* message text
          if (currentMessageText && currentMessageText === newMessageText) {
              if (currentMessageText.parent && overlayContainer) {
                  overlayContainer.removeChild(currentMessageText);
              }
              currentMessageText.destroy();
              currentMessageText = null;
          }
          if (callback) {
              callback();
          }
          currentOverlayTween = null; // Clear timeline reference
      }
  });

  currentOverlayTween = timeline; // Store reference to the new timeline

  // Correctly place commas in GSAP .to() calls
  timeline.to(newMessageText, { alpha: 1, duration: fadeDurationSeconds, ease: "power1.inOut" }) // Fade in
            .to({}, { duration: displayDurationSeconds }) // Use an empty target for a pure delay
            .to(newMessageText, { alpha: 0, duration: fadeDurationSeconds, ease: "power1.inOut" }); // Fade out
}
