export const VIEWS = ["human", "agent"] as const;

export type View = (typeof VIEWS)[number];
