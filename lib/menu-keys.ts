/**
 * Where focus goes in a menu of `count` items when `key` is pressed on item
 * `current`. Arrows wrap; null means the key does not move focus.
 */
export function nextMenuIndex(key: string, current: number, count: number): number | null {
  if (count === 0) return null;
  switch (key) {
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
