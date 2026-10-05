/** Classes that keep a control hidden until its `group` container is hovered or focused; on a touch screen it always shows. */
export const revealOnHover =
  "opacity-0 transition-opacity duration-t-1 ease-plain group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100";
