# V2 Slot Engine: Performance & Optimization Guide

Achieving high performance, especially on mobile devices, is crucial for a competitive slot game experience. This guide outlines key areas for performance consideration and common optimization techniques within the V2 engine architecture.

## 1. Performance Philosophy

*   **Mobile-First:** Always consider the constraints of mobile CPUs, GPUs, and memory.
*   **Profile-Guided Optimization:** Don't optimize prematurely. Use profiling tools to identify actual bottlenecks before implementing complex optimizations.
*   **Balance:** Strive for a balance between performance, code clarity, and development speed.
*   **Continuous Effort:** Performance is not a one-time task; it requires ongoing monitoring and refinement.

## 2. Key Performance Areas & Bottlenecks

Performance issues typically arise in these areas:

1.  **GPU Rendering (PixiJS):** Related to drawing graphics on the screen.
    *   **Draw Calls:** Too many individual drawing instructions sent to the GPU. PixiJS's batch renderer helps significantly, but complex scenes can still exceed budgets.
    *   **Fill Rate / Overdraw:** Rendering too many transparent pixels or layers on top of each other.
    *   **Texture Swaps:** Frequent switching between different texture atlases within the same draw call can break batching.
    *   **Filters & Masks:** Complex shaders, filters (blur, glow), and masking operations can be GPU-intensive.
    *   **Large Textures / High Resolution:** Using unnecessarily large textures impacts memory and bandwidth.
2.  **CPU - JavaScript Execution:** Related to game logic running on the main thread.
    *   **Game Loop (`useTick`):** Performing heavy calculations or complex logic on every frame.
    *   **Physics/Complex Simulations:** (Less common in slots, but possible).
    *   **Inefficient Algorithms:** Poorly optimized win evaluation, state updates, or feature logic.
    *   **Frequent State Updates:** Causing excessive downstream calculations or component updates.
3.  **CPU - React Reconciliation:** The process React uses to update the DOM (or in our case, the PixiJS scene via `@pixi/react`).
    *   **Unnecessary Re-renders:** Components updating when their props/state haven't meaningfully changed.
    *   **Large Component Trees:** Diffing very large or deep component trees can take time (though usually less impactful than rendering or game logic).
4.  **Memory Usage:**
    *   **Texture Memory:** Large, uncompressed textures or too many textures loaded simultaneously.
    *   **Object Allocation/Garbage Collection:** Creating many objects (JS objects, Pixi objects) frequently can lead to garbage collection pauses.
    *   **Leaks:** Failing to clean up resources (Pixi objects, GSAP timelines, event listeners, Zustand subscriptions).
5.  **Loading Time:**
    *   **Large Asset Sizes:** Unoptimized images, sounds.
    *   **Too Many Requests:** Loading many small assets individually.
    *   **Large JS Bundle:** Including unused code or large libraries.

## 3. Optimization Techniques

### 3.1 Rendering (PixiJS / `@pixi/react`)

*   **Texture Atlases:** **Essential.** Combine multiple small images (symbols, UI elements) into larger sprite sheets. This drastically reduces draw calls and texture swaps. Use tools like TexturePacker.
*   **Asset Optimization:** Compress textures (e.g., using WebP where supported) and audio files.
*   **BitmapText:** For text that doesn't change frequently or requires complex styling, consider `PIXI.BitmapText` (requires pre-generating font atlases) over `PIXI.Text` for better performance.
*   **Caching:** Use `cacheAsBitmap` judiciously on complex `PIXI.Container` instances *that don't change internally often*. This flattens the container into a single texture but incurs a cost if the cache needs frequent regeneration.
*   **Limit Filters/Masks:** Use computationally expensive filters and masks sparingly. Apply them to smaller areas if possible.
*   **Object Pooling:** For frequently created/destroyed objects (like particles or short-lived effects), consider implementing an object pool to reuse instances instead of constantly allocating/destroying them.
*   **Visibility Culling:** Ensure off-screen elements are not rendered (`sprite.visible = false` or remove from stage). `@pixi/react` helps with conditional rendering based on state.
*   **PixiJS Settings:** Explore PixiJS settings (`PIXI.settings`) for potential low-level tweaks (though defaults are usually good).

### 3.2 CPU - JavaScript Logic

*   **Optimize `useTick` Callbacks:** Keep logic executed every frame extremely lean. Offload heavy calculations to occur only when necessary (e.g., triggered by state changes).
*   **Debounce/Throttle:** For frequent events (like window resize), use debounce or throttle techniques (e.g., from `lodash-es`) to limit how often handler logic runs.
*   **Memoization:** Use `useMemo` in React for expensive calculations within components, ensuring they only re-run when dependencies change.
*   **Efficient Algorithms:** Review core logic (win evaluation, feature calculations) for algorithmic efficiency.
*   **Web Workers:** For truly heavy, non-UI computations, consider offloading them to Web Workers to avoid blocking the main thread (adds complexity).

### 3.3 CPU - React Reconciliation

*   **Narrow Zustand Selectors:** **Critically important.** Use specific selectors (`useStore(state => state.balance)`) or `shallow` comparison (`useStore(selector, shallow)`) to ensure components *only* re-render when the exact data they need changes.
*   **`React.memo`:** Wrap components that receive props, especially complex ones, with `React.memo` to prevent re-renders if props haven't shallowly changed.
*   **`useCallback`:** Memoize callback functions passed as props to prevent child components wrapped in `React.memo` from re-rendering unnecessarily.
*   **`useMemo` (for Props):** Memoize complex objects or arrays passed as props.
*   **Component Structure:** Avoid unnecessarily deep or wide component trees where state changes high up cause cascading re-renders.
*   **Virtualization:** For very long lists/grids (less common in slots, but possible), consider virtualization libraries.

### 3.4 Memory

*   **Asset Management:** Load necessary assets per game state (e.g., load bonus assets only when entering a bonus) and unload them when no longer needed (`PIXI.Assets.unloadBundle`).
*   **Texture Optimization:** Use compressed formats and appropriate sizes.
*   **Object Pooling:** Reduces garbage collection pressure.
*   **Cleanup:** Implement proper cleanup in `useEffect` return functions: destroy Pixi objects created imperatively, kill GSAP timelines, remove manual event listeners, ensure Zustand subscriptions are handled correctly (usually automatic with hooks).
*   **Profiling:** Use browser memory profiling tools to detect leaks.

### 3.5 Loading Time

*   **Code Splitting:** Leverage Vite's automatic code splitting. Consider dynamic imports (`import()`) for loading code for specific features (like complex bonus games) only when needed.
*   **Asset Bundling:** Use texture atlases and potentially audio sprites.
*   **Asset Compression:** Optimize image and sound file sizes.
*   **Tree Shaking:** Ensure build tools effectively remove unused code from libraries.
*   **Preloading Strategy:** Define asset bundles (`preload`, `gameplay`) in the config and load them strategically using `useAssets` (show loading screen during preload).
*   **Server Compression:** Ensure server uses gzip/Brotli for text-based assets (JS, CSS, JSON).

## 4. Profiling Tools

*   **Browser DevTools:**
    *   **Performance Tab:** Record performance profiles to analyze JavaScript execution time (flame charts), rendering performance (frame analysis), and identify long tasks or layout shifts.
    *   **Memory Tab:** Take heap snapshots to analyze memory usage and detect detached DOM nodes (potential leaks, less relevant for Pixi objects unless bridging to DOM).
    *   **Network Tab:** Analyze asset loading times and sizes.
*   **React DevTools Profiler:** Analyze React component render times and identify unnecessary re-renders.
*   **PixiJS DevTools Extension:** Inspect the PixiJS scene graph, view object properties, and potentially identify rendering issues.
*   **Stats Libraries:** Integrate lightweight stats libraries (like `stats.js`) during development to get real-time FPS and memory usage displays.

By systematically applying relevant optimization techniques and regularly profiling the application, particularly focusing on mobile targets, the V2 engine can achieve the necessary performance for a high-quality user experience.
