# Refactoring Plan: Dedicated Overlay Sub-Containers

**Goal:** Refactor the code so that `FreeSpinsUIManager`, `Notifications`, and `Animations` modules each add their overlay elements to separate, dedicated sub-containers within the main `layerOverlays`, preventing interference.

## Phase 1: Modify `Game.js`

- [X] **1.1 Create Sub-Containers:**
    - [X] Locate `_createLayers` method.
    - [X] Create `fsIndicatorContainer`, `notificationsContainer`, `winAnnouncementsContainer` as `PIXI.Container`.
    - [X] Assign descriptive names (`OverlaySub: ...`).
    - [X] Add sub-containers as children to `layerOverlays` in the desired stacking order (e.g., FS Indicator -> Notifications -> Win Announcements).
- [X] **1.2 Update Module Initialization Calls:**
    - [X] Locate `_initCoreModules` method & `_createManagers`.
    - [X] Pass `fsIndicatorContainer` to `FreeSpinsUIManager` constructor.
    - [X] Pass `notificationsContainer` to `initNotifications`.
    - [X] Pass `winAnnouncementsContainer` to `initAnimations`.

## Phase 2: Update Feature Modules

- [X] **2.1 Modify `FreeSpinsUIManager.js`:**
    - [X] Update constructor to accept and use the passed `parentContainer`.
- [X] **2.2 Modify `Notifications.js`:**
    - [X] Update `initNotifications` to accept and store the assigned container.
    - [X] Replace `overlayContainer` references with the assigned container.
    - [X] *Optional Simplification:* Re-introduced `assignedContainer.removeChildren()`.
- [X] **2.3 Modify `Animations.js`:**
    - [X] Update `initAnimations` to accept and store the assigned overlay container.
    - [X] Replace `overlayContainer` references with the assigned container in the Big/Mega Win section.
    - [X] *Simplification:* Removed `currentBigWinText` tracking.
    - [X] *Simplification:* Re-introduced `assignedOverlayContainer.removeChildren()` before creating new win text.
    - [X] *Simplification:* Updated `setInterval` cleanup logic.

## Phase 3: Testing

- [ ] Run the game.
- [ ] Test FS indicator visibility on entry.
- [ ] Test FS indicator persistence during small wins, rollups, and Big Wins.
- [ ] Test FS indicator persistence during notifications.
- [ ] Test stacking order when overlays overlap.
- [ ] Test FS indicator removal on exit.
- [ ] Verify notifications and Big Win text functionality.
