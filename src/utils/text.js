const RE = {
  WHITESPACE: /\s+/g,
  NON_DIGITS: /[^\d]/g,
  INVALID_FILENAME_CHARS: /[\\/:*?"<>|]/g,
  REGEX_SPECIAL_CHARS: /[.*+?^${}()|[\]\\]/g,
};

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const collapseWhitespace = (value) => value.replace(RE.WHITESPACE, " ");

const escapeRegExp = (value) => value.replace(RE.REGEX_SPECIAL_CHARS, "\\$&");

export function normalizeText(value) {
  return collapseWhitespace(String(value ?? ""))
    .trim()
    .toLowerCase();
}

export function sameText(left, right) {
  return normalizeText(left) === normalizeText(right);
}

export function stripLabel(value, label) {
  if (!value) return "";
  const repeatedLabel = new RegExp(`^(?:\\s*${escapeRegExp(label)}\\s*)+`, "i");
  return value.replace(repeatedLabel, "").trim();
}

export function toInteger(value) {
  return parseInt(String(value ?? "").replace(RE.NON_DIGITS, ""), 10) || 0;
}

export function safeFilename(value) {
  return String(value ?? "")
    .replace(RE.INVALID_FILENAME_CHARS, "_")
    .trim();
}

export const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
