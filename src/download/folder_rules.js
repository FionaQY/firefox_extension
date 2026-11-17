import { safeFilename } from "../utils/text";

const TAG_FIELDS = [
  "rating",
  "warning",
  "category",
  "fandom",
  "relationship",
  "character",
  "freeform",
];

export const DEFAULT_FOLDER_TYPE = "author";

/**
 * What a folder can match on. `tags` = which extracted tag categories to read.
 * `options` = fixed AO3 values, shown as a dropdown instead of a text box.
 */
export const FOLDER_FIELDS = {
  author: {
    label: "Author",
    placeholder: "Username or pseud, comma separated",
  },
  fandom: {
    label: "Fandom",
    tags: ["fandom"],
    placeholder: "Exact fandom tag, comma separated",
  },
  character: {
    label: "Character",
    tags: ["character"],
    placeholder: "Exact character tag, comma separated",
  },
  relationship: {
    label: "Relationship",
    tags: ["relationship"],
    placeholder: "Exact relationship tag, comma separated",
  },
  freeform: {
    label: "Additional tag",
    tags: ["freeform"],
    placeholder: "Exact tag, comma separated",
  },
  rating: {
    label: "Rating",
    tags: ["rating"],
    options: [
      "General Audiences",
      "Teen And Up Audiences",
      "Mature",
      "Explicit",
      "Not Rated",
    ],
  },
  warning: {
    label: "Warning",
    tags: ["warning"],
    options: [
      "Creator Chose Not To Use Archive Warnings",
      "Graphic Depictions Of Violence",
      "Major Character Death",
      "No Archive Warnings Apply",
      "Rape/Non-Con",
      "Underage Sex",
    ],
  },
  category: {
    label: "Category",
    tags: ["category"],
    options: ["F/F", "F/M", "Gen", "M/M", "Multi", "Other"],
  },
  any: {
    label: "Any tag",
    tags: TAG_FIELDS,
    placeholder: "Exact tag, comma separated",
  },
};

export function normalizeFolderType(type) {
  return FOLDER_FIELDS[type] ? type : DEFAULT_FOLDER_TYPE;
}

const norm = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** "Pseud (user), Other" -> {"pseud (user)", "pseud", "user", "other"} */
function authorKeys(author) {
  const keys = new Set();
  for (const part of String(author ?? "").split(",")) {
    const full = norm(part);
    if (!full) continue;
    keys.add(full);
    const match = full.match(/^(.*?)\s*\((.*)\)$/);
    if (match) {
      if (match[1]) keys.add(match[1].trim());
      if (match[2]) keys.add(match[2].trim());
    }
  }
  return keys;
}

function candidates(type, work) {
  if (type === "author") return authorKeys(work.author);
  const fields = FOLDER_FIELDS[type]?.tags || [];
  return new Set(fields.flatMap((field) => work.tags?.[field] || []).map(norm));
}

function compile(pattern) {
  try {
    return new RegExp(pattern, "i");
  } catch {
    return null;
  }
}

export const isValidPattern = (pattern) =>
  Boolean(String(pattern ?? "").trim()) && compile(pattern) !== null;

function matches(rule, work) {
  const have = candidates(rule.type, work);
  if (rule.pattern) return [...have].some((value) => rule.pattern.test(value));
  return rule.values.some((value) => have.has(norm(value)));
}

/** Return the usable rules, in priority order, or [] when the feature is off. */
export function getActiveRules(folders) {
  if (!folders?.enabled || !Array.isArray(folders.rules)) return [];

  return folders.rules.flatMap((rule) => {
    if (!rule || !Array.isArray(rule.values)) return [];
    if (!rule.values.some((value) => norm(value))) return [];

    const type = normalizeFolderType(rule.type);
    const useRegex = rule.regex && !FOLDER_FIELDS[type].options;
    if (!useRegex) return [{ ...rule, type, regex: false }];

    const pattern = compile(String(rule.values[0]).trim());
    if (!pattern) {
      console.warn(`AO3 folders: skipping invalid pattern "${rule.values[0]}"`);
      return [];
    }
    return [{ ...rule, type, pattern }];
  });
}

/** Prefix a filename with the rule's folder (sanitized), if there is one. */
export function withFolder(filename, rule) {
  if (!rule) return filename;
  const fallback = rule.pattern
    ? ""
    : rule.values.find((value) => norm(value)) || "";
  const name = safeFilename(rule.name?.trim() || fallback);
  return name ? `${name}/${filename}` : filename;
}

export function pickFolderForWorks(rules, works) {
  return (
    (rules ?? []).find((rule) => works.some((work) => matches(rule, work))) ??
    null
  );
}
