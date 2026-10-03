// Plain JavaScript so the build's CSP check (scripts/write-csp.mjs) can import
// the exact boot script it has to find a hash for.

export const THEME_STORAGE_KEY = "uno-theme";

/**
 * The browser chrome colour for each theme: --color-bg resolved to sRGB hex.
 * The token cannot be read here: <meta name="theme-color"> is written at build
 * time and takes a literal colour, not a CSS variable or light-dark().
 */
export const THEME_COLORS = { light: "#fbfcfc", dark: "#121414" };

/**
 * Runs in <head> before first paint, so a stored pick applies before the page
 * is drawn and the wrong theme never flashes. It also points the theme-color
 * metas at the pick, once they exist. It must stay self-contained.
 */
export const themeBootScript = `try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);var c=${JSON.stringify(
  THEME_COLORS,
)}[t],f=function(){document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",c)})};f();document.addEventListener("DOMContentLoaded",f)}}catch(e){}`;
