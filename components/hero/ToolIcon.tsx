import type { HeroTool } from "@/content/hero";
import { Glyph } from "./Glyph";

type ToolIconProps = {
  icon: HeroTool["icon"];
  /** Classes for a filled mark. */
  markClassName: string;
  /** Classes for a line icon (email, spreadsheets). */
  lineClassName: string;
};

export function ToolIcon({ icon, markClassName, lineClassName }: ToolIconProps) {
  const line = icon === "mail" || icon === "spreadsheet";
  return <Glyph name={icon} className={line ? lineClassName : markClassName} />;
}
