# V2 Slot Engine: Animation Guide

This guide covers the principles and techniques for implementing animations within the V2 engine, primarily using GSAP (GreenSock Animation Platform) and integrating potentially with Spine for complex skeletal animations.

## 1. Core Animation Library: GSAP

GSAP (v3+) is the standard animation library for the engine due to its power, performance, flexibility, and especially its robust `Timeline` capabilities for sequencing complex animations.

## 2. Integrating GSAP with React & PixiJS

The core pattern involves using React hooks (`useEffect`, `useRef`) to manage GSAP animations targeting PixiJS display objects managed by `@pixi/react` components.

```jsx
// Example: Simple fade-in animation within a component
import React, { useRef, useEffect } from 'react';
import { Sprite } from '@pixi/react';
import { gsap } from 'gsap';

const AnimatedSymbol = ({ texture, x, y, isVisible }) => {
  const spriteRef = useRef(null); // Ref to the underlying PIXI.Sprite

  useEffect(() => {
    if (spriteRef.current) {
      // Animate alpha based on the isVisible prop
      gsap.to(spriteRef.current, {
        alpha: isVisible ? 1 : 0,
        duration: 0.3, // Should come from AnimationTimings config
        ease: 'power1.out', // Should be configurable
      });
    }
    // No cleanup needed for simple 'to' tweens usually
  }, [isVisible]); // Re-run effect when visibility changes

  // Initial alpha should be 0 if starting invisible
  return <Sprite ref={spriteRef} texture={texture} x={x} y={y} alpha={isVisible ? 1 : 0} />;
};
```

**Key Integration Points:**

*   **Targeting:** Use `useRef` on `@pixi/react` components (`<Sprite>`, `<Container>`, etc.) to get a stable reference to the underlying PixiJS object.
*   **Lifecycle:** Use `useEffect` to trigger animations based on prop changes (like `isVisible` above) or component mounting.
*   **Timelines:** For sequences, create `gsap.timeline()` instances within `useEffect`. Store the timeline instance if you need to control it later (pause, resume, reverse, kill).
*   **Cleanup:** Crucial for timelines or tweens that might be interrupted (e.g., component unmounts, dependencies change). Return a cleanup function from `useEffect` that calls `timeline.kill()` to prevent memory leaks and unexpected behaviour.
*   **Configuration:** Animation durations, delays, eases, and target values should ideally be sourced from the game's `AnimationTimings` configuration, passed down via props or accessed from state.

## 3. Standard Engine Animations

`engine-core` implements common, reusable animations:

*   **Reel Spin/Stop:** Handled within the specific reel strip components (e.g., `StandardReelStrip`). Uses GSAP timelines to animate the vertical position/offset of the symbol strip, synchronizing with symbol texture updates and applying configured eases and durations for smooth stopping.
*   **Basic Symbol Win:** Implemented within `BaseSymbol` (or triggered by it). Simple effects like scaling, tinting, or brightness pulses when the `isWinning` prop is true.
*   **UI Element Feedback:** Buttons (`Button.tsx`) use simple GSAP tweens for hover states (scale/tint) and click feedback (quick scale down/up).
*   **Win Rollup:** A dedicated component/hook likely uses GSAP's `ticker` or a `gsap.to` tween on a temporary object, updating the displayed win amount text on each tick/update using number formatting.
*   **Basic Feature Transitions:** Engine features (like Free Spins) might have simple default fade-in/out transitions managed by their controlling hooks/components.

## 4. Implementing Game-Specific Animations

This is where the engine's flexibility is key. Games define their unique visual flair:

1.  **Custom Symbol Animations (Most Common):**
    *   **Method:** Implement a custom symbol component within the game package (`games/[game-name]/src/components/Symbol.tsx`).
    *   **Integration:** Provide this component (or a function that renders it) to the engine's `<ReelContainer>` via the `renderSymbol` prop.
    *   **Implementation:** Inside the custom symbol component, use `useEffect` and `useRef` to create complex GSAP timelines for unique idle loops, elaborate win celebrations, anticipation effects, etc., triggered by props passed down (`symbolId`, `isWinning`, `isAnticipating`, `featureState`).
2.  **Custom Feature Transitions:**
    *   **Method:** Implement the transition animation logic (likely a complex GSAP timeline) within a dedicated component (e.g., `<MyGameFreeSpinsTransition>`) or a function within the game package.
    *   **Integration:** Pass this component/function via props to the engine hook controlling the feature (e.g., `useFreeSpinsController({ onEnterTransition: myGameTransitionAnimation })`). The engine hook calls the function or renders the component at the appropriate time instead of its default behaviour.
3.  **Unique Bonus Game Animations:**
    *   **Method:** Animations are implemented directly within the game-specific bonus components (`games/[game-name]/src/components/bonus/`).
    *   **Integration:** These components are rendered conditionally based on engine state (`activeFeature`). They manage their own internal animations using GSAP.
4.  **Custom Background Effects:**
    *   **Method:** Implement animations within the game-specific background component.
    *   **Integration:** Pass the component to `<GameContainer>` via the `backgroundComponent` prop.
5.  **Overriding Simple Animations:** For minor tweaks to default engine animations (e.g., a different button click effect), it might be simpler to configure different timings/eases. If a complete visual change is needed, consider providing a custom component override (if the engine component supports it via props).

## 5. Using Animation Configuration

*   **`AnimationTimings`:** Store durations, delays, and ease strings (e.g., `'power1.out'`) in the game config (`animations.ts`). Access these values in components/hooks when creating GSAP tweens/timelines.
*   **Turbo Mode:** Access the `isTurboMode` state flag (from `useGameState`). Conditionally apply faster timings or shorter delays from the config, or use `gsap.globalTimeline.timeScale()` to speed up *all* animations (use with caution).
*   **Animation Keys (Conceptual):** For highly complex, named sequences defined in game code (e.g., a specific character's win animation), the config (`SymbolDefinition.winAnimationKey`) might provide a key. The custom symbol component uses this key to select which GSAP timeline function to execute.

## 6. Integrating Spine (Future Potential)

Spine provides powerful skeletal animation capabilities, ideal for complex character movements.

*   **Library:** Use the official `pixi-spine` runtime library.
*   **Assets:** Load Spine `.json`, `.atlas`, and `.png` files via the `useAssets` hook (defined with type `'spine'` in the manifest).
*   **Wrapper Component (`engine-core` or `games/*`):** Create a `<SpineAnimation>` React component.
    *   **Props:** Accept Spine asset data, animation name to play, loop flag, skin name, etc.
    *   **Lifecycle (`useEffect`):** Instantiate `new spine.Spine(spineData)` when assets are ready. Set initial animation and skin.
    *   **Control:** Use `useEffect` to react to prop changes (e.g., new `animationName`) and call `spineInstance.state.setAnimation(...)` or `addAnimation(...)`.
    *   **Adding to Scene:** Get a `useRef` to an `@pixi/react <Container>` and add the `spineInstance` to it within `useEffect`.
    *   **Cleanup:** Call `spineInstance.destroy()` in the `useEffect` cleanup.
*   **Usage:** Render the `<SpineAnimation>` component, often within a custom game-specific symbol component, passing the required props based on symbol state and configuration.

By combining GSAP's power for property/timeline animation with React's component lifecycle/state management, and leveraging component composition for game-specific overrides, the engine provides a robust framework for creating diverse and high-quality animations.

