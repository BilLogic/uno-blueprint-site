/** A CSS time token ("700ms" or "0.7s") in milliseconds; 0 when it is unset. */
export function cssMs(value: string) {
  const time = value.trim();
  const number = parseFloat(time);
  if (Number.isNaN(number)) return 0;
  return time.endsWith("ms") ? number : time.endsWith("s") ? number * 1000 : number;
}

/** A token's value on the page's root, as styles/tokens.css sets it. */
export function rootToken(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
