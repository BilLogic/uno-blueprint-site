import { ideas } from "@/content/ideas";
import { ButtonLink } from "@/components/ui/ButtonLink";

const { plus } = ideas;

function Buttons() {
  return (
    <>
      <ButtonLink link={plus.primary.link} variant="primary" soonLabel={plus.primary.soonLabel}>
        {plus.primary.label}
      </ButtonLink>
      <ButtonLink link={plus.secondary.link} variant="ghost">
        {plus.secondary.label}
      </ButtonLink>
    </>
  );
}

/**
 * A real blueprint, as a case card: mark, name, one line, then a browser
 * frame that runs off the bottom. Where the pointer can hover, the buttons sit
 * over the blurred screenshot; on touch and narrow screens they sit under the
 * text and nothing covers the screenshot. Only one pair is ever displayed. The overlay pair stays in the tab order while it is
 * transparent, and keyboard focus is what reveals it, so it must stay
 * transparent rather than hidden.
 */
export function PlusCard() {
  return (
    <div className="group/case relative grid h-case grid-cols-[minmax(0,5fr)_minmax(0,8fr)] gap-6 overflow-hidden rounded-16 border border-line-2 bg-card transition-[background-color] duration-t-rail ease-plain hover:bg-case-hover max-ml:h-auto max-ml:grid-cols-1">
      <div className="grid content-start gap-2.5 py-8 pl-8 max-ml:px-6 max-ml:pt-6 max-ml:pb-0">
        <span className="mb-2 inline-flex items-center gap-2 text-17 font-medium tracking-mark">
          <img
            src={plus.mark.src.src}
            width={plus.mark.src.width}
            height={plus.mark.src.height}
            alt=""
            className="block size-case-logo rounded-6"
          />
          {plus.mark.name}
        </span>
        <h3 className="text-15 font-medium">{plus.title}</h3>
        <p className="max-w-case-text text-14 text-muted">{plus.body}</p>
        <div className="mt-2 hidden flex-wrap gap-2 case-stacked:flex">
          <Buttons />
        </div>
      </div>
      <div className="relative mt-8 mr-8 flex flex-col self-stretch overflow-hidden rounded-t-10 border border-b-0 border-line bg-screenshot shadow-screenshot max-ml:mx-6 max-ml:mt-0 max-ml:h-case-shot">
        <div aria-hidden className="flex gap-1.5 border-b border-line bg-panel px-3 py-2.5">
          <i className="block size-frame-dot rounded-full bg-line-2" />
          <i className="block size-frame-dot rounded-full bg-line-2" />
          <i className="block size-frame-dot rounded-full bg-line-2" />
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <img
            src={plus.screenshot.src.src}
            width={plus.screenshot.src.width}
            height={plus.screenshot.src.height}
            alt={plus.screenshot.alt}
            loading="lazy"
            decoding="async"
            className="mt-case-crop-top ml-case-crop-left block h-auto w-case-crop max-w-none [transition:filter_var(--duration-t-3)_var(--ease-out),scale_var(--duration-t-4)_var(--ease-out)] group-focus-within/case:scale-107 group-focus-within/case:blur-case group-focus-within/case:saturate-90 group-hover/case:scale-107 group-hover/case:blur-case group-hover/case:saturate-90 case-stacked:scale-none! case-stacked:filter-none! motion-reduce:transition-none"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-case-scrim opacity-0 transition-opacity duration-t-2 ease-plain group-focus-within/case:opacity-100 group-hover/case:opacity-100 case-stacked:hidden">
            <Buttons />
          </div>
        </div>
      </div>
    </div>
  );
}
