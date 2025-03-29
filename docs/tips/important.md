# Important Development Pattern: Managing Shared Overlay Layers

**Context:** We encountered issues where UI elements (like the Free Spins indicator) unexpectedly disappeared from shared overlay layers (`layerOverlays`). This happened because multiple modules (e.g., `Notifications.js`, `Animations.js`) were adding temporary elements (like messages or "Big Win" text) to the same layer.

**Problem:** The initial implementation in these modules used `overlayContainer.removeChildren()` to clean up previous elements before adding new ones. This unintentionally removed **all** elements from the layer, including persistent ones added by other modules (like the Free Spins indicator managed by `FreeSpinsUIManager`).

**Solution/Best Practice:**

1.  **Identify Shared Layers:** Recognize when multiple modules need to add temporary or independent elements to the same parent `PIXI.Container` (e.g., `layerOverlays`).

2.  **Avoid `removeChildren()`:** Never use `container.removeChildren()` on a shared layer, as it blindly wipes out everything.

3.  **Track Module-Specific Elements:** Each module that adds temporary elements to a shared layer should maintain its own internal variable(s) to track the specific `PIXI.DisplayObject`(s) it added.
    *   Example (`Notifications.js`): `let currentMessageText = null;`
    *   Example (`Animations.js`): `let currentBigWinText = null;`

4.  **Targeted Removal:** Before adding a *new* temporary element, check if the module's tracking variable holds a reference to a *previous* element. If it does, explicitly remove **only that specific element** from the container and destroy it.
    ```javascript
    // Example: Before adding a new Big Win text
    if (currentBigWinText && currentBigWinText.parent) {
        overlayContainer.removeChild(currentBigWinText);
        currentBigWinText.destroy({ children: true }); // Ensure proper cleanup
        currentBigWinText = null; // Reset the tracker
    }
    // Now, create and add the new win text...
    const newWinText = new PIXI.Text(...);
    overlayContainer.addChild(newWinText);
    currentBigWinText = newWinText; // Update the tracker
    ```

5.  **Cleanup on Completion:** When the temporary element's purpose is complete (e.g., message fades out, animation finishes), ensure it is explicitly removed from the container, destroyed, and the tracking variable is reset to `null`.

**Key Takeaway:** Be mindful of shared containers. Always perform targeted removal of module-specific elements instead of clearing the entire container.