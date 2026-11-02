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
