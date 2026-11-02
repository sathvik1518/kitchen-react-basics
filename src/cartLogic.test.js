import { describe, expect, it } from "vitest";
import { MAX_QTY, addDish, cartCount, cartTotal, removeDish } from "./cartLogic";

const idli = { id: 1, name: "Idli", price: 40 };
const dosa = { id: 2, name: "Dosa", price: 70 };

// Frozen, so a function that changes its input throws (this file is in strict mode).
const frozen = (...lines) => Object.freeze(lines.map((l) => Object.freeze({ ...l })));

describe("addDish", () => {
  it("adds a new line with quantity 1", () => {
    expect(addDish(frozen(), idli)).toEqual([{ dish: idli, qty: 1 }]);
  });
  it("adding the same dish again raises the quantity, not the number of lines", () => {
    const cart = addDish(addDish(frozen(), idli), idli);
    expect(cart).toEqual([{ dish: idli, qty: 2 }]);
  });
  it("keeps other lines and their order", () => {
    const cart = addDish(frozen({ dish: idli, qty: 1 }, { dish: dosa, qty: 1 }), idli);
    expect(cart.map((l) => [l.dish.id, l.qty])).toEqual([[1, 2], [2, 1]]);
  });
  it("stops at the maximum", () => {
    expect(addDish(frozen({ dish: idli, qty: MAX_QTY }), idli)[0].qty).toBe(MAX_QTY);
  });
  it("returns a new array and does not change the old one", () => {
    const before = frozen({ dish: idli, qty: 1 });
    const after = addDish(before, dosa);
    expect(after).not.toBe(before);
    expect(before).toHaveLength(1);
  });
});

describe("removeDish", () => {
  it("removes the whole line", () => {
    const cart = removeDish(frozen({ dish: idli, qty: 3 }, { dish: dosa, qty: 1 }), 1);
    expect(cart).toEqual([{ dish: dosa, qty: 1 }]);
  });
  it("an id that is not there changes nothing", () => {
    expect(removeDish(frozen({ dish: idli, qty: 1 }), 99)).toEqual([{ dish: idli, qty: 1 }]);
  });
});

describe("cartTotal and cartCount", () => {
  const cart = frozen({ dish: idli, qty: 2 }, { dish: dosa, qty: 1 });
  it("adds up price x quantity", () => expect(cartTotal(cart)).toBe(150));
  it("counts every item", () => expect(cartCount(cart)).toBe(3));
  it("an empty cart is 0", () => {
    expect(cartTotal([])).toBe(0);
    expect(cartCount([])).toBe(0);
  });
});
