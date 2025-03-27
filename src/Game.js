import { setupCustomAnimations } from './features/AnimationDemo.js';

// Add the following call after the game is initialized:
// Find the game's initialization function/method and add this after other initialization code
setupCustomAnimations().catch(err => console.error("Failed to setup custom animations:", err)); 