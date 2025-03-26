export const SYMBOL_DEFINITIONS = [
  {
    id: "FACE1",
    color: 0xffd700,
    text: "(:",
    payout: { 3: 10, 4: 25, 5: 100 },
  },
  {
    id: "FACE2",
    color: 0x8b4513,
    text: "{:",
    payout: { 3: 8, 4: 20, 5: 80 },
  },
  {
    id: "FACE3",
    color: 0xde6fa1,
    text: "):",
    payout: { 3: 6, 4: 15, 5: 60 },
  },
  {
    id: "KNIFE",
    color: 0xa9a9a9,
    text: "K",
    payout: { 3: 4, 4: 10, 5: 40 },
  },
  {
    id: "CUP",
    color: 0xdc143c,
    text: "U",
    payout: { 3: 3, 4: 8, 5: 30 },
  },
  {
    id: "PATCH",
    color: 0x4682b4,
    text: "!",
    payout: { 3: 2, 4: 5, 5: 20 },
  },
  {
    id: "SCAT",
    color: 0xff00ff,
    text: "$",
    payout: { 3: 5, 4: 10, 5: 25 }, // Note: Scatter payout is often handled differently (any position)
  },
  {
    id: "LOW",
    color: 0x556b2f,
    text: "~",
    payout: { 3: 1, 4: 2, 5: 10 },
  },
];

// Derived Paytable for quick lookup
export const PAYTABLE = SYMBOL_DEFINITIONS.reduce((table, sym) => {
  if (sym.payout) table[sym.id] = sym.payout;
  return table;
}, {});
