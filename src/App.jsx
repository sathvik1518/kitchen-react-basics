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
