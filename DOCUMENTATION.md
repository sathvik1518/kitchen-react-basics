# Kitchen React Basics: Menu, Cart and a Loading State

**Day 22 Mini Capstone, React Basics**  
**Project folder:** `kitchen-react-basics`

---

## 1. Goal

The first React screen of the Kitchen App. The task (Day 22 Deep Dive, Mini Capstone) asked for:

1. **`App`** owns the cart state.
2. **`Menu` and `MenuItem`** render the menu, with proper **keys**.
3. **`Cart` and `CartLine`** show what has been added, with a working **Remove** button.
4. A **loading state** while the (still hardcoded) menu is being prepared.

Think of a restaurant with one manager (`App`) who holds the order pad (the state). The menu board (`Menu`) and the bill (`Cart`) only show what the manager tells them. When a customer points at a dish, the board does not write on the pad itself. It tells the manager ("they want Idli"), and the manager updates the pad and re-hangs both boards.

The two habits this project is built to practice:

- **Never edit the pad, write a new page.** State is replaced with a new array, never changed in place. React only notices a change when it receives something new.
- **Name rows by who they are, not where they stand.** The `key` of a row is the dish's id, not its position in the list.

---

## 2. Tools

| Tool | Role |
|---|---|
| React 19 (JavaScript, JSX) | The screens |
| Vite | Dev server and build |
| Vitest + jsdom | Test runner and fake browser |
| React Testing Library + user-event | Render the screen and act like a user |

---

## 3. Project structure

```
kitchen-react-basics/
├── package.json
├── vite.config.js
├── index.html
├── .gitignore
├── README.md
├── DOCUMENTATION.md
└── src/
    ├── menuData.js          (the hardcoded menu, and loadMenu that pretends to take time)
    ├── cartLogic.js         (cart rules, no React)
    ├── Menu.jsx             (Menu and MenuItem)
    ├── Cart.jsx             (Cart and CartLine)
    ├── App.jsx              (owns the state)
    ├── App.css
    ├── main.jsx
    ├── cartLogic.test.js    (10 tests)
    ├── App.test.jsx         (15 tests)
    └── test/
        └── setup.js         (rules for every test)
```

---

## 4. Setup commands

```bash
npm create vite@latest kitchen-react-basics -- --template react
cd kitchen-react-basics
npm install
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

**`package.json` scripts**

```json
"dev": "vite",
"build": "vite build",
"test": "vitest run"
```

---

## 5. The idea: who owns what

```
                    App   (owns: cart, menu, loadError)
                   /    \
        menu, onAdd      lines, total, onRemove
                /          \
            Menu            Cart
              |               |
          MenuItem ×N     CartLine ×N
   (click Add)  ──▶ onAdd(dish) ──▶ App: setCart(addDish(current, dish)) ──▶ everything redraws
```

| Piece | Owns state? | Gets (props) | Tells the parent |
|---|---|---|---|
| `App` | **Yes**: `cart`, `menu`, `loadError` | `loadMenu` (replaceable for tests) | |
| `Menu` / `MenuItem` | No | `dishes`, `onAdd` / `dish`, `onAdd` | `onAdd(dish)` |
| `Cart` / `CartLine` | No | `lines`, `total`, `onRemove` / `line`, `onRemove` | `onRemove(dishId)` |

**The loading state.** `menu` starts as `null`, which means "not here yet". `App` shows `Loading the menu...` until the promise from `loadMenu` gives the menu. If it fails, `Could not load the menu.` shows. The `ignore` flag in the effect makes sure an answer that arrives late (after the screen changed or the loader was replaced) is thrown away.

**Why `setCart((current) => ...)`.** The function form always works on the latest cart, even if two clicks happen quickly.

**Why keys matter.** With `key={index}`, removing the first row makes React reuse the first row's element for the second dish and delete the last element. Anything attached to that row (a typed text, a focus) ends up on the wrong dish. With `key={dish.id}`, each element stays with its dish. A test proves it by checking the Dosa row's element is still on the page after Idli is removed.

---

## 6. The code

### `src/menuData.js`

```js
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
```

### `src/cartLogic.js`

```js
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
```

### `src/Menu.jsx`

```jsx
// One menu item. It gets its data through props, and tells the parent through a function prop.
export function MenuItem({ dish, onAdd }) {
  return (
    <li className="row">
      <span>
        {dish.name} <small>₹{dish.price}</small>
      </span>
      <button type="button" aria-label={`Add ${dish.name} to cart`} onClick={() => onAdd(dish)}>
        Add
      </button>
    </li>
  );
}

// The list. It only draws. It owns no state, and the key is the dish's id (not its position).
export default function Menu({ dishes, onAdd }) {
  if (dishes.length === 0) return <p>The menu is empty.</p>;
  return (
    <ul>
      {dishes.map((dish) => (
        <MenuItem key={dish.id} dish={dish} onAdd={onAdd} />
      ))}
    </ul>
  );
}
```

### `src/Cart.jsx`

```jsx
export function CartLine({ line, onRemove }) {
  const { dish, qty } = line;
  return (
    <li className="row">
      <span>
        {qty} × {dish.name} <small>₹{dish.price * qty}</small>
      </span>
      <button type="button" aria-label={`Remove ${dish.name}`} onClick={() => onRemove(dish.id)}>
        Remove
      </button>
    </li>
  );
}

export default function Cart({ lines, total, onRemove }) {
  if (lines.length === 0) return <p>Your cart is empty.</p>;
  return (
    <>
      <ul>
        {lines.map((line) => (
          <CartLine key={line.dish.id} line={line} onRemove={onRemove} />
        ))}
      </ul>
      <p>
        <strong>Total: ₹{total}</strong>
      </p>
    </>
  );
}
```

### `src/App.jsx`

```jsx
import { useEffect, useState } from "react";
import { addDish, cartCount, cartTotal, removeDish } from "./cartLogic";
import Cart from "./Cart";
import Menu from "./Menu";
import { loadMenu as defaultLoadMenu } from "./menuData";
import "./App.css";

// App owns all the state. Menu and Cart only receive what to draw and what to call.
// `loadMenu` can be replaced, so a test can control when the menu arrives.
export default function App({ loadMenu = defaultLoadMenu }) {
  const [cart, setCart] = useState([]);
  const [menu, setMenu] = useState(null); // null means "not here yet"
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let ignore = false; // if the screen goes away before the menu arrives, do nothing with it
    loadMenu()
      .then((dishes) => {
        if (!ignore) setMenu(dishes);
      })
      .catch(() => {
        if (!ignore) setLoadError(true);
      });
    return () => {
      ignore = true;
    };
  }, [loadMenu]);

  return (
    <main className="kitchen">
      <h1>Kitchen</h1>

      <section aria-labelledby="menu-title">
        <h2 id="menu-title">Menu</h2>
        {loadError ? (
          <p role="alert">Could not load the menu.</p>
        ) : menu === null ? (
          <p role="status">Loading the menu...</p>
        ) : (
          <Menu dishes={menu} onAdd={(dish) => setCart((current) => addDish(current, dish))} />
        )}
      </section>

      <section aria-labelledby="cart-title">
        <h2 id="cart-title">Your cart ({cartCount(cart)})</h2>
        <Cart lines={cart} total={cartTotal(cart)} onRemove={(id) => setCart((current) => removeDish(current, id))} />
      </section>
    </main>
  );
}
```

### `src/App.css`

```css
.kitchen { max-width: 28rem; margin: 2rem auto; font-family: system-ui, sans-serif; padding: 0 1rem; }
.kitchen ul { list-style: none; padding: 0; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid #e5e7eb; }
.row button { cursor: pointer; }
```

### `src/main.jsx`

```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

### `vite.config.js` (test setup)

```js
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
  },
});
```

### Design decisions

| Decision | Reason |
|---|---|
| `App` owns the state; `Menu` and `Cart` own none | One place changes the cart, so there is one place to look when something is wrong. |
| Children tell the parent through function props (`onAdd`, `onRemove`) | Data flows down, events flow up. A child never edits the parent's data. |
| Cart rules live in `cartLogic.js`, not in components | Plain functions with no React are easy to test and reuse. |
| Cart functions return new arrays | React sees a new array and redraws. Editing the old one would change nothing on screen. Tests pass frozen arrays so a secret edit throws. |
| `setCart((current) => addDish(current, dish))` | Works on the newest cart even when clicks come close together. |
| `key={dish.id}` (never the index) | Keeps each row's element attached to its dish when the list changes. |
| The cart stores `{ dish, qty }` lines | One line per dish, with a quantity, instead of the same dish many times. |
| Quantity is capped at 10 | A cart line of 5000 Idli is a typo, not an order. |
| Cart total and count are worked out when drawing, not stored | A stored total can go out of date. A calculated one cannot. |
| `menu === null` means loading | Distinguishes "not here yet" from "here but empty" (an empty array), which have different messages. |
| Three separate messages: loading, error, empty menu | Each tells the person something different. |
| `useEffect` with an `ignore` flag in its cleanup | Throws away an answer that arrives late, instead of letting it overwrite a newer one. |
| `loadMenu` is a prop with a default | Tests control when the menu arrives. The real app uses the default. |
| Buttons are named `Add Idli to cart` and `Remove Idli` | Screen readers read buttons out of context. A bare `Add` repeated four times says nothing. |
| `role="status"` for loading and `role="alert"` for the error | Screen readers announce them when they appear. |
| The test setup fails any test that calls `console.error` | React reports mistakes (a missing key, a bad update) there. Without this, they would hide in the output. |

---

## 7. Tests (25 tests)

The component tests render the real `App` and click like a person. The menu loader is replaced by one the test controls (`controlledLoader`), so a test can look at the screen *before* the menu arrives. Any `console.error` fails the test (see `src/test/setup.js`), so a missing `key` cannot slip through.

| # | Test | What it proves |
|---|---|---|
| 1 to 5 | `addDish`: new line; same dish raises quantity; keeps other lines and order; stops at the maximum; new array, old one untouched | Cart rules |
| 6 to 7 | `removeDish`: removes the whole line; unknown id changes nothing | Remove rule |
| 8 to 10 | `cartTotal` and `cartCount`; empty cart | Totals |
| 11 | Loading message first, menu only after it arrives | The loading state |
| 12 | If loading fails, an error shows | Error state |
| 13 | The menu is loaded once | No repeat loading |
| 14 | A late answer from an old loader is ignored | The `ignore` flag |
| 15 | Every dish shows with price and an Add button | Menu |
| 16 | An empty menu has its own message | Empty state |
| 17 | Cart starts empty | Initial state |
| 18 | Add puts the dish in the cart, with the total and the heading count | Add works |
| 19 | Adding the same dish twice makes one line with quantity 2 | Merging lines |
| 20 | Remove takes the line out and updates the total | Remove works |
| 21 | Removing the last line shows the empty message again | Back to empty |
| 22 | Remove affects only its own line | Right line |
| 23 | Proper keys: the other row's element survives a removal | Keys |
| 24 | The menu does not change when the cart changes | Separation |
| 25 | The heading count follows every change | Count |

### `src/test/setup.js`

```js
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, vi } from "vitest";

// React reports mistakes (a missing key, a bad update) with console.error.
// Any console.error fails the test, so mistakes cannot hide in the output.
let errorSpy;
beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  const calls = errorSpy.mock.calls.map((c) => c.join(" "));
  errorSpy.mockRestore();
  expect(calls, "console.error was called during the test").toEqual([]);
});
```

### `src/cartLogic.test.js`

```js
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
```

### `src/App.test.jsx`

```jsx
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { MENU } from "./menuData";

// A loader the test controls: the menu arrives only when the test says so.
function controlledLoader() {
  let resolve, reject;
  const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
  const loader = vi.fn(() => promise);
  return { loader, arrive: () => resolve(MENU), resolveWith: (menu) => resolve(menu), fail: () => reject(new Error("boom")) };
}

async function renderApp() {
  const user = userEvent.setup();
  const instant = () => Promise.resolve(MENU);
  render(<App loadMenu={instant} />);
  await screen.findByText("Idli");
  return user;
}

const cartSection = () => screen.getByRole("region", { name: /your cart/i });
const menuSection = () => screen.getByRole("region", { name: "Menu" });

describe("loading state", () => {
  it("shows a loading message, not the menu, until the menu arrives", async () => {
    const { loader, arrive } = controlledLoader();
    render(<App loadMenu={loader} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading the menu...");
    expect(screen.queryByText("Idli")).toBeNull();

    arrive();
    expect(await screen.findByText("Idli")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows an error if the menu cannot be loaded", async () => {
    const { loader, fail } = controlledLoader();
    render(<App loadMenu={loader} />);
    fail();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the menu.");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("loads the menu once", async () => {
    const { loader, arrive } = controlledLoader();
    render(<App loadMenu={loader} />);
    arrive();
    await screen.findByText("Idli");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("ignores a late answer from an old loader (the `ignore` flag)", async () => {
    // Loader A is replaced by loader B. A answers AFTER B, and must not overwrite B's menu.
    const a = controlledLoader();
    const b = controlledLoader();
    const { rerender } = render(<App loadMenu={a.loader} />);
    rerender(<App loadMenu={b.loader} />);

    b.arrive();
    expect(await screen.findByText("Idli")).toBeInTheDocument();

    // A still answers, but with a different menu.
    const lateMenu = [{ id: 99, name: "Late Dish", price: 1 }];
    a.resolveWith(lateMenu);
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText("Late Dish")).toBeNull();
    expect(screen.getByText("Idli")).toBeInTheDocument();
  });
});

describe("menu", () => {
  it("shows every dish with its price and an Add button", async () => {
    await renderApp();
    const items = within(menuSection()).getAllByRole("listitem");
    expect(items).toHaveLength(MENU.length);
    expect(items[1]).toHaveTextContent("Dosa");
    expect(items[1]).toHaveTextContent("₹70");
    expect(within(items[1]).getByRole("button", { name: "Add Dosa to cart" })).toBeInTheDocument();
  });

  it("says so when the menu is empty", async () => {
    render(<App loadMenu={() => Promise.resolve([])} />);
    expect(await screen.findByText("The menu is empty.")).toBeInTheDocument();
  });
});

describe("cart", () => {
  it("starts empty", async () => {
    await renderApp();
    expect(within(cartSection()).getByText("Your cart is empty.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your cart (0)" })).toBeInTheDocument();
  });

  it("Add puts the dish in the cart and shows the total", async () => {
    const user = await renderApp();
    await user.click(screen.getByRole("button", { name: "Add Dosa to cart" }));
    expect(within(cartSection()).getByText(/1 × Dosa/)).toBeInTheDocument();
    expect(within(cartSection()).getByText("Total: ₹70")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your cart (1)" })).toBeInTheDocument();
  });

  it("adding the same dish twice makes one line with quantity 2", async () => {
    const user = await renderApp();
    const add = screen.getByRole("button", { name: "Add Idli to cart" });
    await user.click(add);
    await user.click(add);
    expect(within(cartSection()).getAllByRole("listitem")).toHaveLength(1);
    expect(within(cartSection()).getByText(/2 × Idli/)).toBeInTheDocument();
    expect(within(cartSection()).getByText("Total: ₹80")).toBeInTheDocument();
  });

  it("Remove takes the line out and updates the total", async () => {
    const user = await renderApp();
    await user.click(screen.getByRole("button", { name: "Add Idli to cart" }));
    await user.click(screen.getByRole("button", { name: "Add Dosa to cart" }));
    await user.click(screen.getByRole("button", { name: "Remove Idli" }));
    expect(within(cartSection()).queryByText(/Idli/)).toBeNull();
    expect(within(cartSection()).getByText(/Dosa/)).toBeInTheDocument();
    expect(within(cartSection()).getByText("Total: ₹70")).toBeInTheDocument();
  });

  it("removing the last line shows the empty message again", async () => {
    const user = await renderApp();
    await user.click(screen.getByRole("button", { name: "Add Idli to cart" }));
    await user.click(screen.getByRole("button", { name: "Remove Idli" }));
    expect(within(cartSection()).getByText("Your cart is empty.")).toBeInTheDocument();
  });

  it("Remove only affects its own line", async () => {
    const user = await renderApp();
    for (const name of ["Idli", "Dosa", "Pongal"]) await user.click(screen.getByRole("button", { name: `Add ${name} to cart` }));
    await user.click(screen.getByRole("button", { name: "Remove Dosa" }));
    const lines = within(cartSection()).getAllByRole("listitem").map((li) => li.textContent);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/Idli/);
    expect(lines[1]).toMatch(/Pongal/);
  });

  it("uses proper keys: removing one line keeps the other lines' elements alive", async () => {
    // With the list position as the key, React would reuse the first element for the second dish
    // and delete the last one, so the element for Dosa would disappear. With the dish id it survives.
    const user = await renderApp();
    await user.click(screen.getByRole("button", { name: "Add Idli to cart" }));
    await user.click(screen.getByRole("button", { name: "Add Dosa to cart" }));
    const dosaLine = within(cartSection()).getByText(/Dosa/).closest("li");
    await user.click(screen.getByRole("button", { name: "Remove Idli" }));
    expect(dosaLine.isConnected).toBe(true);
  });

  it("the menu is not touched when the cart changes", async () => {
    const user = await renderApp();
    await user.click(screen.getByRole("button", { name: "Add Idli to cart" }));
    expect(within(menuSection()).getAllByRole("listitem")).toHaveLength(MENU.length);
  });

  it("the cart count in the heading follows every change", async () => {
    const user = await renderApp();
    await user.click(screen.getByRole("button", { name: "Add Idli to cart" }));
    await user.click(screen.getByRole("button", { name: "Add Idli to cart" }));
    await user.click(screen.getByRole("button", { name: "Add Pongal to cart" }));
    expect(screen.getByRole("heading", { name: "Your cart (3)" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Idli" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Your cart (1)" })).toBeInTheDocument());
  });
});
```

---

## 8. Results

| Check | Command | Result |
|---|---|---|
| Tests | `npm test` | **25 passed** (2 files) |
| Build | `npm run build` | Built successfully |
| Break-it check 1 | Used the list position as the key in the cart | **1 test failed** |
| Break-it check 2 | Left the key off the menu rows | **1 test failed** (React's warning) |
| Break-it check 3 | `addDish` edited the cart instead of copying it | **12 tests failed** |
| Break-it check 4 | The loading state never ended | **14 tests failed** |
| Break-it check 5 | Removed the `ignore` flag | **1 test failed** |
| Break-it check 6 | Total ignored the quantity | **2 tests failed** |
| Break-it check 7 | Remove deleted every OTHER line | **7 tests failed** |
| Break-it check 8 | No error shown when loading fails | **1 test failed** |
| Restored original | `npm test` | **25 passed** |

---

## 9. Problems avoided

| Problem | Cause | Fix |
|---|---|---|
| Screen not updating after an add | Editing the cart array in place gives React nothing new to notice | Return a new array every time, and test with frozen input |
| Row content jumping to the wrong dish after a remove | `key` was the position in the list | `key={dish.id}`, and a test that checks the element survives |
| A missing key hiding as a console message | React only logs the warning | The test setup fails any test with `console.error` |
| Loading and empty menu looking the same | Both would be an empty list | `null` means loading, `[]` means empty, each with its own message |
| A late answer overwriting a newer one | Two loads in flight, the old one finishing last | `ignore` flag in the effect cleanup, and a test with two loaders |
| A test that proved nothing | The first version checked that nothing broke after unmount, but React 19 does not warn about that | Replaced by the late-answer test, which fails when the flag is removed |
| Unnamed buttons | Four buttons that all say `Add` | Names that include the dish |

---

## 10. What was practiced

- Splitting a screen into components and passing data down with props.
- Keeping state in one owner and passing functions down for events.
- Updating state without editing it (new arrays), using the function form of `setState`.
- Rendering lists with the right `key`, and seeing what a wrong key does.
- Showing loading, error, empty and normal states separately.
- Using `useEffect` for loading, with a cleanup that ignores a late answer.
- Testing a React screen like a person uses it, and controlling time with a fake loader.
- Checking that tests are real by breaking the code on purpose, and fixing a test that proved nothing.

---

## 11. Known limit

The menu is hardcoded and `loadMenu` only pretends to wait 800 ms. Real fetching, with caching and retries, comes in Day 24. The cart is in memory only, so a refresh empties it. Remove deletes the whole line; the task does not ask for a one-by-one decrease.

---

## 12. How to run it

```bash
cd kitchen-react-basics
npm install
npm test        # 25 tests
npm run dev     # open the link
```

In the page you will see `Loading the menu...` for under a second, then the menu. Add a dish twice and the cart shows one line with quantity 2. Remove deletes the line.
