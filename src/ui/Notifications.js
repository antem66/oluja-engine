import * as PIXI from 'pixi.js';
import { winAnimDelayMultiplier } from '../config/animationSettings.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameSettings.js';

// Reference to the overlay container (needs initialization)
let overlayContainer = null;
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
 * @param {number} duration - How long to display the message (ms).
 * @param {function} [callback] - Optional function to call after the message disappears.
 */
export function showOverlayMessage(message, duration, callback) {
  if (!overlayContainer) {
      console.error("Notifications: Overlay container not initialized.");
      return;
  }
  overlayContainer.removeChildren(); // Clear previous messages

  const messageStyle = {
    fontFamily: "Impact, Charcoal, sans-serif",
    fontSize: 60,
    fill: { // Define gradient fill explicitly
        gradient: 'linear',
        stops: [
            { offset: 0, color: 0xffffff }, // White
            { offset: 1, color: 0xdddddd }  // Light gray
        ]
    },
    stroke: { color: "#333333", width: 4 },
    dropShadow: { color: "#000", distance: 4, blur: 4 },
    align: 'center', // Use string literal
    lineSpacing: 10,
  };

  const messageText = new PIXI.Text({
    text: message,
    style: messageStyle,
  });
  messageText.anchor.set(0.5);
  messageText.x = GAME_WIDTH / 2;
  messageText.y = GAME_HEIGHT / 2;

  overlayContainer.addChild(messageText);

  // Use adjusted duration
  const displayDuration = duration * winAnimDelayMultiplier;

  setTimeout(() => {
    if (messageText.parent) { // Check if it hasn't been removed already
        overlayContainer.removeChild(messageText);
        messageText.destroy(); // Clean up Pixi object
    }
    if (callback) {
        callback(); // Execute callback if provided
    }
  }, displayDuration);
}
