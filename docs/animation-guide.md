# Custom Symbol Animation Guide

This guide explains how to create custom animations for the symbols in your slot machine game.

## Quick Start

1. **Register a Basic Animation**

```javascript
import { registerSymbolAnimation } from './features/Animations.js';

// In your initialization code
registerSymbolAnimation("FACE1", (symbol, timeline, config) => {
  // Add animation to the timeline
  timeline.to(symbol, {
    rotation: symbol.rotation + Math.PI * 2, // Full rotation
    duration: config.duration,
    ease: "power1.inOut"
  });
  
  return timeline;
});
```

2. **Apply Your Animation**

Your animation will automatically be applied when this symbol is part of a winning line!

## Types of Animations

You can create several types of animations for your symbols:

### 1. GSAP Property Animations

Animate any PIXI.js properties using GSAP:
- `position` (x, y)
- `scale` (scale.x, scale.y)
- `rotation`
- `alpha` (transparency)
- `tint` (color overlay)

```javascript
registerSymbolAnimation("SCAT", (symbol, tl, config) => {
  // Bounce up and down
  tl.to(symbol, {
    y: symbol.y - 20, // Move up
    duration: 0.3,
    ease: "power1.out"
  }).to(symbol, {
    y: symbol.y, // Back to original position
    duration: 0.5,
    ease: "bounce.out"
  });
  
  return tl;
});
```

### 2. Filter-Based Animations

Use PIXI.js filters for advanced effects:
- Glow
- Blur
- Displacement (wave effects)
- Color matrix effects
- and more!

```javascript
registerSymbolAnimation("KNIFE", (symbol, tl, config) => {
  // Create a glow filter
  const glowFilter = new PIXI.GlowFilter();
  glowFilter.innerStrength = 0;
  glowFilter.outerStrength = 0;
  glowFilter.color = 0xFF0000; // Red glow
  
  // Add filter to symbol
  symbol.addFilter(glowFilter, "glow");
  
  // Animate the glow
  tl.to(glowFilter, {
    outerStrength: 15,
    duration: 0.5,
    ease: "power2.out"
  }).to(glowFilter, {
    outerStrength: 0,
    duration: 0.5,
    ease: "power2.in"
  });
  
  // Clean up after animation
  const currentOnComplete = tl.eventCallback("onComplete");
  tl.eventCallback("onComplete", () => {
    if (currentOnComplete) currentOnComplete();
    symbol.removeFilter("glow");
  });
  
  return tl;
});
```

### 3. Sprite Sheet Animations

Replace the symbol with an animated sprite sheet sequence:

```javascript
import { createSpriteSheetAnimationFn } from './features/SpriteSheetAnimations.js';

// First load your sprite sheet
loadSpriteSheet(
  'explosion',
  'assets/spritesheets/explosion.png',
  explosionJSON,
  30 // fps
);

// Then register the animation
registerSymbolAnimation(
  "FACE3",
  createSpriteSheetAnimationFn('explosion', 'explode', 0.8)
);
```

## Animation Configuration

The `config` parameter provides useful values:

```javascript
registerSymbolAnimation("CUP", (symbol, tl, config) => {
  // Access these properties in config:
  config.duration            // Base animation duration
  config.originalScaleX      // Original symbol scale.x
  config.originalScaleY      // Original symbol scale.y
  config.originalAlpha       // Original symbol alpha
  config.originalRotation    // Original symbol rotation
  config.originalTint        // Original symbol tint
  config.targetScaleUp       // Suggested max scale factor
  config.initialDipScale     // Suggested initial dip scale
  config.easeType            // Suggested ease type
  config.easeBack            // Suggested elastic ease
  config.goldTint            // Gold color for highlights
  
  // Your animation code...
  return tl;
});
```

## Creating Sprite Sheets

1. Use tools like TexturePacker, Aseprite, or Spine to create sprite sheet animations
2. Export as a spritesheet image + JSON data
3. Place in your assets folder
4. Load using the `loadSpriteSheet` function
5. Register using `createSpriteSheetAnimationFn`

## Best Practices

1. **Always clean up after yourself**
   - Remove any added filters
   - Return to original properties

2. **Be mindful of animation duration**
   - Use `config.duration` to scale your animation timing
   - Adjust for turbo mode automatically
   
3. **Stagger animations for multiple wins**
   - Use the `index` parameter to add slight delays

4. **Test different win combinations**
   - Ensure animations look good for both single and multiple wins

## Advanced Tips

1. **Chaining Animations**
   
   ```javascript
   // Create a sequence of different effects
   tl.to(symbol, {...}, 0)          // Start together
     .to(symbol.scale, {...}, 0.3)  // Start at 0.3 seconds
     .to(symbol, {...}, 0.6);       // Start at 0.6 seconds
   ```

2. **Combining Different Animation Types**

   ```javascript
   // Mix property animations with filters
   const glowFilter = new PIXI.GlowFilter();
   symbol.addFilter(glowFilter);
   
   tl.to(symbol.scale, {...})  // Scale animation
     .to(glowFilter, {...});   // Filter animation
   ```

3. **Interactive Animations**

   Make animations that react to player interaction:
   
   ```javascript
   // Register a click event
   symbol.interactive = true;
   symbol.on('pointerdown', () => {
     // Trigger special animation on click
   });
   ```

## Need Help?

- Check the [PIXI.js documentation](https://pixijs.download/release/docs/index.html) for display object properties
- See [GSAP documentation](https://greensock.com/docs/) for animation techniques
- Look at the example animations in `src/features/AnimationDemo.js` 