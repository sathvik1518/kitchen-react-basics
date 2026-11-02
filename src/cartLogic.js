// The cart rules, with no React in them.
// A cart is an array of lines: { dish, qty }.
// Every function returns a NEW array. The old one is never changed.
// (React only notices a change when it gets a new array, not when the old one is edited.)

export const MAX_QTY = 10;

/** One more of this dish. A dish that is not in the cart yet gets a new line. */
export function addDish(cart, dish) {
  const line = cart.find((l) => l.dish.id === dish.id);
  if (!line) return [...cart, { dish, qty: 1 }];
  return cart.map((l) => (l.dish.id === dish.id ? { ...l, qty: Math.min(MAX_QTY, l.qty + 1) } : l));
}

/** Takes the whole line out of the cart. */
export function removeDish(cart, dishId) {
  return cart.filter((l) => l.dish.id !== dishId);
}

export const cartTotal = (cart) => cart.reduce((sum, l) => sum + l.dish.price * l.qty, 0);

export const cartCount = (cart) => cart.reduce((sum, l) => sum + l.qty, 0);
