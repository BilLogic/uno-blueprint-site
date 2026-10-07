/** When a control shows: once its `group` container is hovered or focused, and always on a touch screen. It carries no transition of its own. */
export const revealStates =
  "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100";

/** Classes that keep a control hidden until its `group` container is hovered or focused; on a touch screen it always shows. */
export const revealOnHover = `${revealStates} transition-opacity duration-t-1 ease-plain`;
