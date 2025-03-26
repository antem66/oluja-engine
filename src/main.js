import { Game } from './core/Game.js';

// --- Entry Point ---

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // ID of the container element in index.html where the Pixi canvas will be added
    const gameContainerId = 'game-container'; // Make sure this ID exists in index.html

    // Create and initialize the game instance
    const game = new Game(gameContainerId);
    game.init().catch(err => {
        console.error("Failed to initialize game:", err);
        // Optionally display an error message to the user in the DOM
        const container = document.getElementById(gameContainerId);
        if (container) {
            container.innerHTML = `<p style="color: red; text-align: center; margin-top: 50px;">Error loading game. Please check console.</p>`;
        }
    });
});
