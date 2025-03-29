import { describe, it, expect } from 'vitest';
import { FeatureManager } from '../src/utils/FeatureManager.js';

describe('FeatureManager', () => {
  it('should initialize with default features', () => {
    const fm = new FeatureManager();
    expect(fm.isEnabled('autoplay')).toBe(true);
    expect(fm.isEnabled('turboMode')).toBe(true);
    expect(fm.isEnabled('freeSpins')).toBe(true);
    expect(fm.isEnabled('debugTools')).toBe(false);
    expect(fm.isEnabled('debugForceWin')).toBe(false);
    expect(fm.isEnabled('debugUseMockApi')).toBe(true);
  });

  it('should allow overriding defaults via constructor', () => {
    const fm = new FeatureManager({
      autoplay: false,
      debugTools: true,
    });
    expect(fm.isEnabled('autoplay')).toBe(false); // Overridden
    expect(fm.isEnabled('turboMode')).toBe(true); // Default
    expect(fm.isEnabled('debugTools')).toBe(true); // Overridden
  });

  it('should load flags and override existing ones', () => {
    const fm = new FeatureManager();
    expect(fm.isEnabled('turboMode')).toBe(true);
    expect(fm.isEnabled('debugTools')).toBe(false);

    fm.loadFlags({
      turboMode: false, // Override existing
      debugTools: true, // Override existing
      newFeature: true, // Add new
    });

    expect(fm.isEnabled('turboMode')).toBe(false);
    expect(fm.isEnabled('debugTools')).toBe(true);
    expect(fm.isEnabled('newFeature')).toBe(true);
    expect(fm.isEnabled('autoplay')).toBe(true); // Check non-overridden default
  });

  it('isEnabled should return false for undefined features', () => {
    const fm = new FeatureManager();
    expect(fm.isEnabled('nonExistentFeature')).toBe(false);
  });

  it('loadFlags should handle null or undefined input gracefully', () => {
    const fm = new FeatureManager({ autoplay: false });
    expect(() => fm.loadFlags(null)).not.toThrow();
    expect(fm.isEnabled('autoplay')).toBe(false); // Should retain constructor flags

    expect(() => fm.loadFlags(undefined)).not.toThrow();
    expect(fm.isEnabled('autoplay')).toBe(false);
  });
}); 