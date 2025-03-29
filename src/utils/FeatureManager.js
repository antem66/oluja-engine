export class FeatureManager {
  constructor(initialFlags = {}) {
    // Default core features, can be overridden by initialFlags or loadFlags
    this.features = {
      autoplay: true,
      turboMode: true,
      freeSpins: true,
      // --- Debug Features (Default to false, enable via config) ---
      debugTools: false,
      debugForceWin: false, // Consistent naming with plan task 2.3
      debugUseMockApi: true, // Default to TRUE initially as per plan
      // --- Add future feature flags here ---
      // bonusGameXYZ: false,
    };
    this.loadFlags(initialFlags); // Apply initial flags over defaults
  }

  loadFlags(flags) {
    if (flags) {
      this.features = { ...this.features, ...flags };
    }
  }

  isEnabled(featureName) {
    return this.features[featureName] === true;
  }

  // Optional: Methods to enable/disable dynamically if needed later
  // enable(featureName) {
  //   this.features[featureName] = true;
  // }
  // disable(featureName) {
  //   this.features[featureName] = false;
  // }
}

// Export a global instance for now. This might change with DI implementation later.
export const featureManager = new FeatureManager(); 