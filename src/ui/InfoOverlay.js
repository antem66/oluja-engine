// Placeholder import for game state
import { state } from '../core/GameState.js';

// Reference to the DOM element (needs to be initialized, perhaps in UIManager or Game)
let infoOverlayElement = null;

/**
 * Initializes the reference to the info overlay DOM element.
 * Should be called once during setup.
 * @param {HTMLElement} element - The DOM element for the info overlay.
 */
export function initInfoOverlay(element) {
    if (!element) {
        console.error("InfoOverlay: Provided element is invalid.");
        return;
    }
    infoOverlayElement = element;
    console.log("InfoOverlay initialized with element:", infoOverlayElement);
}

/**
 * Updates the content and visibility of the info overlay DOM element
 * based on the current game state (Autoplay, Free Spins).
 */
export function updateInfoOverlay() {
    if (!infoOverlayElement) {
        // console.warn("InfoOverlay: Element not initialized yet.");
        return; // Don't try to update if the element isn't set
    }

    let txt = "";
    if (state.isAutoplaying) {
        txt += `AUTOPLAY: ${state.autoplaySpinsRemaining}<br>`;
    }
    if (state.isInFreeSpins) {
        txt += `FREE SPINS: ${state.freeSpinsRemaining}<br>FS WIN: €${state.totalFreeSpinsWin.toFixed(2)}`;
    }

    if (txt) {
        infoOverlayElement.innerHTML = txt;
        infoOverlayElement.style.display = "block";
    } else {
        infoOverlayElement.innerHTML = ""; // Clear content when not needed
        infoOverlayElement.style.display = "none";
    }
}
