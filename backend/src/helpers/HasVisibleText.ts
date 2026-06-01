const INVISIBLE_TEXT_CHARS = /[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

const hasVisibleText = (value?: string | null): boolean =>
  String(value ?? "").replace(INVISIBLE_TEXT_CHARS, "").trim().length > 0;

export default hasVisibleText;
