/**
 * A boolean as a data attribute: present (and empty) when true, absent when
 * false, so `data-*:` variants style the true state.
 */
export const dataFlag = (on: boolean) => (on ? "" : undefined);
