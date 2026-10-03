import markDark from "@/public/images/uno-mark-dark.png";
import markLight from "@/public/images/uno-mark-light.png";

const markClass = "size-mark rounded-mark";

/** The mark and the name; the mark swaps with the theme so it keeps its contrast. */
export function Logo({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 font-medium max-xs:text-14 max-xs:whitespace-nowrap">
      <img src={markLight.src} width={markLight.width} height={markLight.height} alt="" className={`${markClass} dark:hidden`} />
      <img src={markDark.src} width={markDark.width} height={markDark.height} alt="" className={`${markClass} hidden dark:block`} />
      {name}
    </div>
  );
}
