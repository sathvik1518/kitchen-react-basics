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
