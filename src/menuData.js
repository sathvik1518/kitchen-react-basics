// The menu is hardcoded for now. Next week it will come from a real server.
export const MENU = [
  { id: 1, name: "Idli", price: 40 },
  { id: 2, name: "Dosa", price: 70 },
  { id: 3, name: "Pongal", price: 60 },
  { id: 4, name: "Filter Coffee", price: 30 },
];

/**
 * Pretends the menu takes a moment to prepare, like a real request would.
 * Returns a promise that gives the menu after `delayMs`.
 */
export function loadMenu(delayMs = 800) {
  return new Promise((resolve) => setTimeout(() => resolve(MENU), delayMs));
}
