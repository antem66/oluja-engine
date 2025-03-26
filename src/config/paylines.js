export const PAYLINES = [
  [1, 1, 1, 1, 1], // Line 1 (Middle row)
  [0, 0, 0, 0, 0], // Line 2 (Top row)
  [2, 2, 2, 2, 2], // Line 3 (Row below middle)
  [3, 3, 3, 3, 3], // Line 4 (Bottom row)
  [0, 1, 2, 1, 0], // Line 5 (V shape)
  [3, 2, 1, 2, 3], // Line 6 (Inverted V)
  [0, 1, 1, 1, 0], // Line 7
  [3, 2, 2, 2, 3], // Line 8
  [1, 2, 1, 0, 1], // Line 9
  [2, 1, 2, 3, 2], // Line 10
  [0, 0, 1, 2, 2], // Line 11
  [3, 3, 2, 1, 1], // Line 12
  [1, 0, 1, 2, 3], // Line 13
  [2, 3, 2, 1, 0], // Line 14
  [1, 2, 3, 2, 1], // Line 15
];

// Derived constant
export const NUM_PAYLINES = PAYLINES.length;
