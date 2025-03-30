# Feature Plan: 007 - Mobile Responsiveness

**Status:** Proposed

## 1. Goal

To adapt the Oluja Slot Engine's display and user interface to function correctly and provide a good user experience across a range of screen sizes and aspect ratios, with a particular focus on mobile devices (smartphones and tablets).

## 2. Context

The current engine implementation relies on fixed dimensions (`GAME_WIDTH`, `GAME_HEIGHT`) defined in `gameSettings.js` and uses absolute pixel coordinates for most UI element positioning (e.g., in `uiPanelLayout.js`). This results in a non-responsive layout that will not adapt well to different screen sizes.

Achieving responsiveness requires fundamental changes to how the game canvas is managed and how UI elements are positioned and potentially scaled.

## 3. Requirements

*   The game canvas should dynamically resize or scale to fit the available browser viewport.
*   A clear scaling strategy needs to be chosen and implemented (e.g., letterboxing the fixed aspect ratio, scaling internal elements, a combination).
*   UI elements (buttons, text displays, overlays) must remain usable, readable, and appropriately sized on smaller screens.
*   The core reel area should remain the visual focus and be unobstructed.
*   Consideration for both portrait and landscape orientations on mobile devices.
*   Maintain acceptable rendering performance on target devices.

## 4. Phases & Tasks

**Phase 1: Research & Strategy Definition**

*   [ ] **Task 1.1:** Define target device resolutions and aspect ratios (e.g., common phone/tablet sizes).
*   [ ] **Task 1.2:** Choose a primary scaling strategy:
    *   Option A: Letterboxing/Pillarboxing - Maintain the game's fixed aspect ratio and add black bars where needed. Simplest, but may not use screen real estate optimally.
    *   Option B: Scale & Reflow - Scale the core game elements and potentially rearrange UI elements based on available space. More complex, better screen usage.
    *   Option C: Hybrid approach.
*   [ ] **Task 1.3:** Decide on handling orientation changes (force orientation, support both?).
*   [ ] **Task 1.4:** Document the chosen strategy and target specifications.

**Phase 2: Canvas & Viewport Management**

*   [ ] **Task 2.1:** Modify `Game.js` (`_setupPixiApp` or a new resize handler) to listen for browser window resize events.
*   [ ] **Task 2.2:** Implement logic to resize the PixiJS renderer (`app.renderer.resize(width, height)`) based on the window size.
*   [ ] **Task 2.3:** Implement the chosen scaling strategy from Phase 1. This might involve:
    *   Scaling the main `app.stage` container.
    *   Calculating viewport dimensions and adjusting camera/container positions.
    *   Updating projection matrices if using advanced techniques.
*   [ ] **Task 2.4:** Ensure the game background (`BackgroundManager`) adapts correctly to the new viewport/scaling.

**Phase 3: UI Layout Adaptation**

*   [ ] **Task 3.1:** Refactor `uiPanelLayout.js` to support relative positioning and sizing *or* define multiple layout profiles.
    *   Explore options: percentage-based coordinates, anchoring (e.g., `anchorX: 'left'`, `offsetX: 10`), or separate layout objects for breakpoints (e.g., `mobileLayout`, `desktopLayout`).
*   [ ] **Task 3.2:** Update `UIManager._buildPanelFromConfig` to interpret the new responsive layout data and calculate final positions based on the current viewport size.
*   [ ] **Task 3.3:** Update `UIManager._createTextDisplays` similarly to position text elements dynamically.
*   [ ] **Task 3.4:** Create or integrate utility functions for common responsive calculations (e.g., converting percentages to pixels, calculating anchored positions).
*   [ ] **Task 3.5:** Adapt other UI elements (Logo, FS Indicator, Overlays) as needed, potentially making their managers aware of viewport changes or providing them with relative positioning data.

**Phase 4: Element Scaling & Visibility**

*   [ ] **Task 4.1:** Implement logic within `UIManager` or `ButtonFactory` to optionally scale buttons or text if needed for readability on very small/large screens.
*   [ ] **Task 4.2:** Consider dynamically adjusting text styles (font size) based on screen size.
*   [ ] **Task 4.3:** Identify any non-essential UI elements that could be hidden on the smallest target screens to reduce clutter.

**Phase 5: Testing & Refinement**

*   [ ] **Task 5.1:** Test thoroughly using browser developer tools (responsive design mode).
*   [ ] **Task 5.2:** Test on target physical devices or reliable emulators.
*   [ ] **Task 5.3:** Test both portrait and landscape orientations if supported.
*   [ ] **Task 5.4:** Profile rendering performance on lower-end target devices.
*   [ ] **Task 5.5:** Iterate on layout adjustments, scaling factors, and visibility rules based on testing feedback.

**Phase 6: Documentation**

*   [ ] **Task 6.1:** Update `docs/core/ui-architecture.md` to describe the responsive design approach.
*   [ ] **Task 6.2:** Add notes to relevant configuration files (`gameSettings.js`, `uiPanelLayout.js`) explaining any new responsive properties.
*   [ ] **Task 6.3:** Update this plan document to reflect the final implementation status.

## 5. Discussion Points / Decisions

*   What is the minimum supported screen resolution/aspect ratio?
*   Which scaling strategy offers the best balance between implementation effort and user experience for this specific game layout?
*   Should landscape, portrait, or both orientations be supported on mobile?
*   How should very wide or very tall aspect ratios be handled?
