export const QUOTES = ['"', "'", "`"];
export const OPENING_BRACKETS = ["[", "{", "("];
export const CLOSING_BRACKETS = ["]", "}", ")"];
export const ALL_BRACKETS = [...OPENING_BRACKETS, ...CLOSING_BRACKETS] as const;
