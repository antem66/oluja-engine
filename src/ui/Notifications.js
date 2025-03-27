
import * as PIXI from 'pixi.js';
import { gsap } from 'gsap'; // Import GSAP
import { winAnimDelayMultiplier } from '../config/animationSettings.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameSettings.js';

// Reference to the overlay container (needs initialization)
let overlayContainer = null;
let currentOverlayTween = null; // To manage GSAP tween
let flashElementInterval = null; // Store interval ID for flashing

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
  if (flashElementInterval) clearInterval(flashElementInterval); // Clear previous interval
  if (!element?.parent) return; // Don't flash if element isn't on stage

  const originalTint = element.tint ?? 0xffffff;
  let count = 0;
  element.visible = true; // Ensure it's visible

  const duration = baseDuration * winAnimDelayMultiplier; // Adjust duration based on turbo

  function doFlash() {
    if (!element?.parent) { // Stop if element is removed
      clearInterval(flashElementInterval);
      return;
    }
    if (count >= flashes * 2) { // Completed all flashes
      clearInterval(flashElementInterval);
      element.tint = originalTint; // Restore original tint
      // Optionally hide if it's the win text and there's no win? Needs context.
      // if (element === winText && lastTotalWin <= 0) element.visible = false;
      return;
    }
    // Alternate between flash color and original tint
    element.tint = count % 2 === 0 ? flashColor : originalTint;
    count++;
  }

  doFlash(); // Start immediately
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
  // Kill previous tween if running
  if (currentOverlayTween) {
      currentOverlayTween.kill();
  }
  overlayContainer.removeChildren(); // Clear previous messages

  const messageStyle = {
    fontFamily: "Impact, Charcoal, sans-serif",
    fontSize: 60,
    // Use an array for a simple linear gradient (top to bottom)
    fill: [0xffffff, 0xdddddd],
    stroke: { color: "#333333", width: 4 },
    dropShadow: {
        color: "#000",
        distance: 4,
        blur: 4,
        angle: Math.PI / 4, // Add default angle
        alpha: 0.7,        // Add default alpha
    },
    align: 'center',
    lineSpacing: 10,
  }; // Define style object

  const messageText = new PIXI.Text({
    text: message,
    style: messageStyle, // Pass the style object directly
  });
  messageText.anchor.set(0.5);
  messageText.x = GAME_WIDTH / 2;
  messageText.y = GAME_HEIGHT / 2;

  overlayContainer.addChild(messageText);

  // Use GSAP for fade in, hold, and fade out
  const displayDurationSeconds = (baseDuration / 1000) * winAnimDelayMultiplier;
  const fadeDurationSeconds = 0.3 * winAnimDelayMultiplier; // Quick fade

  messageText.alpha = 0; // Start invisible

  currentOverlayTween = gsap.timeline({
      onComplete: () => {
          if (messageText.parent) {
              overlayContainer.removeChild(messageText);
              messageText.destroy();
          }
          if (callback) {
              callback();
          }
          currentOverlayTween = null; // Clear reference
      }
  });

  // Correctly place commas in GSAP .to() calls
  currentOverlayTween.to(messageText, { alpha: 1, duration: fadeDurationSeconds, ease: "power1.inOut" }) // Fade in
                     .to(messageText, { duration: displayDurationSeconds }) // Hold (vars object is optional if only duration is needed)
                     .to(messageText, { alpha: 0, duration: fadeDurationSeconds, ease: "power1.inOut" }); // Fade out
}
