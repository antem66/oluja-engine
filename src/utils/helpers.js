/**
 * Linearly interpolates between two angles, handling wrapping around a range (e.g., 360 degrees or 2*PI radians).
 * @param {number} start - The starting angle.
 * @param {number} end - The target angle.
 * @param {number} t - The interpolation factor (0 to 1).
 * @param {number} range - The full range of the angle (e.g., Math.PI * 2 for radians).
 * @returns {number} The interpolated angle.
 */
export function lerpAngle(start, end, t, range) {
    t = Math.max(0, Math.min(1, t)); // Clamp t between 0 and 1
    let delta = end - start;

    // Adjust delta if the shortest path wraps around the range
    if (Math.abs(delta) > range / 2) {
        delta -= Math.sign(delta) * range;
    }

    let result = start + delta * t;

    // Ensure the result stays within the valid range (e.g., 0 to range)
    return ((result % range) + range) % range;
}

/**
 * Easing function: quadratic ease-out.
 * Starts fast, then decelerates.
 * @param {number} t - Progress ratio (0 to 1).
 * @returns {number} Eased progress ratio.
 */
export const easeOutQuad = (t) => t * (2 - t);

// Add other general utility functions here if needed later.
