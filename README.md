# Heavens Ten Deluxe - PixiJS Slot Machine

This is a simple slot machine game built using HTML5 Canvas and the PixiJS rendering library.

## Features

*   5 Reels, 4 Rows
*   Multiple Paylines
*   Configurable Symbols and Payouts
*   Reel Spinning Animation with Blur and Bounce
*   Chained Reel Stops (Sequential)
*   Win Evaluation and Line Drawing
*   Winning Symbol Animations
*   Autoplay Feature
*   Turbo Mode
*   Free Spins Bonus Round
*   Particle Effects for Wins

## Running the Game

Simply open the `index.html` file in a modern web browser that supports ES Modules.

No build step is required for the basic version.

## Project Structure

*   `index.html`: Main HTML file.
*   `public/`: Static assets (images, audio - currently unused).
*   `src/`: JavaScript source code and CSS.
    *   `main.js`: Entry point.
    *   `styles/`: CSS files.
    *   `config/`: Game configuration data.
    *   `core/`: Core game classes/modules.
    *   `ui/`: User interface components and logic.
    *   `features/`: Specific game features (Free Spins, Autoplay, etc.).
    *   `utils/`: Utility functions.
*   `package.json`: Project metadata.

## Development (Optional)

For a better development experience (live reload, bundling), consider using a tool like Vite:

```bash
# Navigate to the project directory
cd heavens-ten-deluxe

# Install Vite (if not already installed globally)
npm install -g create-vite

# Initialize Vite in the current project (choose Vanilla JS template)
npm create vite@latest . -- --template vanilla

# Install dependencies
npm install

# Run the development server
npm run dev
