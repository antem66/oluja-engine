import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';

// Store loaded sprite sheets
const loadedSpriteSheets = new Map();

/**
 * Loads and configures a sprite sheet for animation
 * 
 * @param {string} spriteSheetId - Unique identifier for this sprite sheet
 * @param {string} spriteSheetUrl - URL to the sprite sheet image
 * @param {object} spriteSheetData - Sprite sheet data (frames, animations)
 * @param {number} [fps=24] - Frames per second for animations
 * @returns {Promise<PIXI.Spritesheet>} - The loaded sprite sheet
 */
export async function loadSpriteSheet(spriteSheetId, spriteSheetUrl, spriteSheetData, fps = 24) {
    if (loadedSpriteSheets.has(spriteSheetId)) {
        console.log(`Sprite sheet ${spriteSheetId} already loaded`);
        return loadedSpriteSheets.get(spriteSheetId);
    }

    // Create a new sprite sheet
    const baseTexture = await PIXI.Assets.load(spriteSheetUrl);
    const spriteSheet = new PIXI.Spritesheet(baseTexture, spriteSheetData);
    
    // Parse the sprite sheet
    await spriteSheet.parse();
    
    // Store animation metadata with the sprite sheet
    spriteSheet.animationFps = fps;
    
    // Store for future use
    loadedSpriteSheets.set(spriteSheetId, spriteSheet);
    console.log(`Loaded sprite sheet: ${spriteSheetId}`);
    
    return spriteSheet;
}

/**
 * Creates an animated sprite using frames from a sprite sheet
 * 
 * @param {string} spriteSheetId - The ID of the previously loaded sprite sheet
 * @param {string} animationName - The animation sequence name
 * @param {boolean} [loop=true] - Whether the animation should loop
 * @returns {PIXI.AnimatedSprite|null} - The animated sprite or null if not found
 */
export function createAnimatedSprite(spriteSheetId, animationName, loop = true) {
    if (!loadedSpriteSheets.has(spriteSheetId)) {
        console.error(`Sprite sheet ${spriteSheetId} not loaded`);
        return null;
    }
    
    const spriteSheet = loadedSpriteSheets.get(spriteSheetId);
    
    // Get texture array for the animation
    let textures = [];
    
    // If the animationName is a specific animation sequence in the data
    if (spriteSheet.animations && spriteSheet.animations[animationName]) {
        textures = spriteSheet.animations[animationName];
    } else {
        // Try to find all textures with this prefix (e.g., "explosion_" + 0,1,2,3...)
        const prefix = `${animationName}_`;
        
        // Check if we have textures with this prefix
        let index = 0;
        let texture = spriteSheet.textures[`${prefix}${index}`];
        
        while (texture) {
            textures.push(texture);
            index++;
            texture = spriteSheet.textures[`${prefix}${index}`];
        }
        
        // If no textures found with number suffix, try to find a single frame
        if (textures.length === 0) {
            const singleTexture = spriteSheet.textures[animationName];
            if (singleTexture) {
                textures.push(singleTexture);
            }
        }
    }
    
    if (textures.length === 0) {
        console.error(`Animation "${animationName}" not found in sprite sheet ${spriteSheetId}`);
        return null;
    }
    
    // Create the animated sprite
    const animatedSprite = new PIXI.AnimatedSprite(textures);
    animatedSprite.animationSpeed = spriteSheet.animationFps / 60; // Convert FPS to PIXI's animation speed
    animatedSprite.loop = loop;
    
    return animatedSprite;
}

/**
 * Replaces a symbol with an animated sprite temporarily during win animations
 * 
 * @param {import('../core/Symbol.js').SymbolSprite} symbol - The symbol to replace with animation
 * @param {string} spriteSheetId - ID of the sprite sheet to use
 * @param {string} animationName - Name of the animation to play
 * @param {number} duration - Duration to show the animation (seconds)
 * @param {boolean} [keepOriginalScale=true] - Whether to maintain the original symbol's scale
 * @returns {Promise<void>} - Resolves when animation completes
 */
export async function playSpriteSheetAnimation(symbol, spriteSheetId, animationName, duration, keepOriginalScale = true) {
    return new Promise(resolve => {
        // Create animated sprite
        const animatedSprite = createAnimatedSprite(spriteSheetId, animationName, true);
        if (!animatedSprite) {
            resolve();
            return;
        }
        
        // Store original properties
        const parent = symbol.parent;
        const originalIndex = parent.getChildIndex(symbol);
        const originalX = symbol.x;
        const originalY = symbol.y;
        const originalScaleX = symbol.scale.x;
        const originalScaleY = symbol.scale.y;
        const originalVisible = symbol.visible;
        
        // Setup animated sprite
        animatedSprite.x = originalX;
        animatedSprite.y = originalY;
        animatedSprite.anchor.set(0.5, 0.5);
        
        if (keepOriginalScale) {
            animatedSprite.scale.set(originalScaleX, originalScaleY);
        }
        
        // Hide original symbol and show animation
        symbol.visible = false;
        parent.addChildAt(animatedSprite, originalIndex);
        animatedSprite.play();
        
        // Setup cleanup after animation finishes
        gsap.delayedCall(duration, () => {
            // Hide and remove animated sprite
            animatedSprite.stop();
            parent.removeChild(animatedSprite);
            
            // Restore original symbol
            symbol.visible = originalVisible;
            
            // Resolve the promise
            resolve();
        });
    });
}

/**
 * Creates a registration function for sprite-sheet based symbol animations
 * 
 * @param {string} spriteSheetId - The sprite sheet ID to use
 * @param {string} animationName - The animation name to play
 * @param {number} [duration=1.0] - Animation duration in seconds
 * @param {boolean} [keepOriginalSize=true] - Whether to maintain original symbol size
 * @returns {Function} - Animation function to register
 */
export function createSpriteSheetAnimationFn(spriteSheetId, animationName, duration = 1.0, keepOriginalSize = true) {
    return (symbol, timeline, config) => {
        // To avoid blocking the timeline, we'll run this as a side effect
        // and continue the regular timeline
        playSpriteSheetAnimation(
            symbol, 
            spriteSheetId, 
            animationName, 
            duration * config.duration, 
            keepOriginalSize
        );
        
        // Return the timeline so other effects can be chained
        return timeline;
    };
} 