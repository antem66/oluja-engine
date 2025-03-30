import * as PIXI from 'pixi.js';
import { gsap } from 'gsap'; // Import GSAP
import { winAnimDelayMultiplier } from '../config/animationSettings.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameSettings.js';

// Reference to the overlay container (needs initialization)
/** @type {PIXI.Container | null} */
let assignedContainer = null; // Renamed from overlayContainer
/** @type {gsap.core.Timeline | null} */
let currentOverlayTween = null; // To manage GSAP tween
/** @type {any} */
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
    assignedContainer = container; // Use assignedContainer
    console.log("Notifications initialized with container:", assignedContainer); // Use assignedContainer
}

/**
 * Flashes a PixiJS display object (like Text or Sprite) with a specific color using GSAP.
 * @param {PIXI.Sprite | PIXI.Text | PIXI.Container} element - The Pixi element to flash.
 * @param {number} [flashColor=0xff0000] - The color to flash (hex).
 * @param {number} [baseDuration=150] - Base duration of each flash phase (ms). Note: GSAP uses seconds.
 * @param {number} [flashes=2] - Number of full on/off cycles.
 */
export function flashElement(
  element,
  flashColor = 0xff0000,
  baseDuration = 150,
  flashes = 2
) {
    // Kill any previous flash tween on the same element
    gsap.killTweensOf(element, "tint"); 

    if (!element?.parent) return; // Don't flash if element isn't on stage

    const originalTint = element.tint ?? 0xffffff;
    element.visible = true; // Ensure it's visible

    // GSAP uses seconds
    const durationSeconds = (baseDuration / 1000) * winAnimDelayMultiplier;

    // Use gsap.to for a simple repeating tween
    gsap.to(element, {
        tint: flashColor, // Target flash color
        duration: durationSeconds, 
        repeat: flashes * 2 -1, // Repeat for total on/off cycles minus the initial set
        yoyo: true, // Go back to the original tint automatically
        ease: "none", // No easing needed for simple flash
        onComplete: () => {
            // Ensure the tint is restored correctly at the very end
            // (sometimes yoyo might leave it on the flash color)
            element.tint = originalTint;
            // Optional: log completion
            // console.log("Flash complete for:", element);
        }
    });
}

/**
 * Displays a temporary message centered on the screen in the overlay container.
 * @param {string} message - The text message to display (use \n for newlines).
 * @param {number} baseDuration - Base duration to display the message (ms) before fading.
 * @param {function} [callback] - Optional function to call after the message disappears.
 */
export function showOverlayMessage(message, baseDuration, callback) {
  if (!assignedContainer) { // Check assignedContainer
      console.error("Notifications: Overlay container not initialized.");
      return;
  }

  // --- Clean up previous message --- START
  // Kill previous tween if running
  if (currentOverlayTween) {
      currentOverlayTween.kill();
      currentOverlayTween = null;
  }
  // REMOVED: Logic for removing currentMessageText

  // RE-INTRODUCED: Safely clear the dedicated notifications container
  assignedContainer.removeChildren();
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

  // Create the new message text
  const newMessageText = new PIXI.Text({
    text: message,
    style: style,
  });
  newMessageText.anchor.set(0.5);
  newMessageText.x = GAME_WIDTH / 2;
  newMessageText.y = GAME_HEIGHT / 2;
  newMessageText.alpha = 0; // Start invisible

  // REMOVED: currentMessageText = newMessageText;

  // Add directly to the assigned container
  assignedContainer.addChild(newMessageText);

  // Use GSAP for fade in, hold, and fade out
  const displayDurationSeconds = (baseDuration / 1000) * winAnimDelayMultiplier;
  const fadeDurationSeconds = 0.3 * winAnimDelayMultiplier; // Quick fade

  // Create the new timeline
  const timeline = gsap.timeline({
      onComplete: () => {
          // Container is cleared at the start of the next call,
          // or we can explicitly clear it here if preferred.
          // Let's clear it here for immediate cleanup after fade.
          if (assignedContainer && newMessageText.parent) {
              assignedContainer.removeChild(newMessageText);
              newMessageText.destroy();
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
