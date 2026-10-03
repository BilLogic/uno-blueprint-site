"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { nextMenuIndex } from "@/lib/menu-keys";

type Option<T extends string> = { value: T; label: string };

type RadioMenuProps<T extends string> = {
  label: string;
  icon: ReactNode;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Width of the open menu; the prototype sizes each menu to its longest label. */
  menuClassName: string;
};

/**
 * An icon button that opens a menu of mutually exclusive choices above it,
 * following the WAI-ARIA menu button pattern.
 */
export function RadioMenu<T extends string>({
  label,
  icon,
  options,
  value,
  onChange,
  menuClassName,
}: RadioMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const pressing = useRef(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const checked = options.findIndex((option) => option.value === value);
    items.current[Math.max(checked, 0)]?.focus();
    const closeOnOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [open, options, value]);

  function close() {
    setOpen(false);
    button.current?.focus();
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    const current = items.current.findIndex((item) => item === document.activeElement);
    const next = nextMenuIndex(event.key, current, options.length);
    if (next === null) return;
    event.preventDefault();
    items.current[next]?.focus();
  }

  // Focus that leaves the button and its menu closes the menu. Escape and a
  // pick move focus to the button, which is inside, so they are unaffected. A
  // press inside is ignored: Safari blurs without focusing the pressed item,
  // and closing then would unmount the item before its click lands.
  function onBlur(event: FocusEvent<HTMLDivElement>) {
    if (pressing.current) return;
    if (!(event.relatedTarget instanceof Node && root.current?.contains(event.relatedTarget))) {
      setOpen(false);
    }
  }

  return (
    <div
      ref={root}
      onBlur={onBlur}
      onPointerDown={() => {
        pressing.current = true;
        document.addEventListener("pointerup", () => (pressing.current = false), { once: true });
      }}
      className="relative"
    >
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className="grid size-9 cursor-pointer place-items-center rounded-6 text-muted [&_svg]:size-icon"
      >
        {icon}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className={`absolute right-0 bottom-9 z-10 animate-menu-in rounded-10 border border-line bg-panel p-1 shadow-menu motion-reduce:animate-none ${menuClassName}`}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(node) => {
                items.current[index] = node;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={option.value === value}
              tabIndex={-1}
              onClick={() => {
                onChange(option.value);
                close();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-6 px-2.5 py-menu-item-y text-left text-14 leading-none text-ink before:size-1.5 before:flex-none before:rounded-full before:content-[''] hover:bg-card aria-checked:before:bg-ink"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
