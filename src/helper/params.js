const WORK_DEFAULTS = {
  "work_search[sort_column]": "revised_at",
  "work_search[other_tag_names]": "",
  "work_search[excluded_tag_names]": "",
  "work_search[crossover]": "",
  "work_search[complete]": "",
  "work_search[words_from]": "",
  "work_search[words_to]": "",
  "work_search[date_from]": "",
  "work_search[date_to]": "",
  "work_search[query]": "",
  "work_search[language_id]": "",
  commit: "Sort and Filter",
  tag_id: "",
  page: "1",
  pseud_id: "",
  user_id: "",
  "exclude_work_search[archive_warning_ids][]": "",
  "exclude_work_search[freeform_ids][]": "",
  "exclude_work_search[rating_ids][]": "",
  "exclude_work_search[category_ids][]": "",
  "exclude_work_search[fandom_ids][]": "",
  "exclude_work_search[character_ids][]": "",
  "exclude_work_search[relationship_ids][]": "",
  "include_work_search[archive_warning_ids][]": "",
  "include_work_search[freeform_ids][]": "",
  "include_work_search[rating_ids][]": "",
  "include_work_search[category_ids][]": "",
  "include_work_search[fandom_ids][]": "",
  "include_work_search[character_ids][]": "",
  "include_work_search[relationship_ids][]": "",
};

const BOOKMARK_DEFAULTS = {
  "bookmark_search[sort_column]": "created_at",
  "bookmark_search[other_tag_names]": "",
  "bookmark_search[other_bookmark_tag_names]": "",
  "bookmark_search[excluded_tag_names]": "",
  "bookmark_search[excluded_bookmark_tag_names]": "",
  "bookmark_search[bookmarkable_query]": "",
  "bookmark_search[bookmark_query]": "",
  "bookmark_search[language_id]": "",
  "bookmark_search[rec]": "",
  "bookmark_search[with_notes]": "",
  commit: "Sort and Filter",
  page: "1",
  pseud_id: "",
  user_id: "",
  "exclude_bookmark_search[rating_ids][]": "",
  "exclude_bookmark_search[archive_warning_ids][]": "",
  "exclude_bookmark_search[category_ids][]": "",
  "exclude_bookmark_search[fandom_ids][]": "",
  "exclude_bookmark_search[character_ids][]": "",
  "include_bookmark_search[rating_ids][]": "",
  "include_bookmark_search[archive_warning_ids][]": "",
  "include_bookmark_search[category_ids][]": "",
  "include_bookmark_search[fandom_ids][]": "",
  "include_bookmark_search[character_ids][]": "",
};

function mergeParams(defaults, params) {
  const out = {};
  for (const [key, def] of Object.entries(defaults)) {
    const val = params.get(key)?.trim();
    out[key] = !val || val.length === 0 ? def : val;
  }
  return out;
}

export function getParams(baseUrl, isBookmarks = false) {
  return mergeParams(
    isBookmarks ? BOOKMARK_DEFAULTS : WORK_DEFAULTS,
    baseUrl.searchParams,
  );
}

export function getBookmarkParams(baseUrl) {
  return getParams(baseUrl, true);
}

export function setValue(searchParams, key, val) {
  searchParams[key] = val;
  return searchParams;
}

export function getValue(searchParams, key) {
  return searchParams[key] || "";
}

export function addValue(searchParams, key, val) {
  const rawStr = getValue(searchParams, key);
  const blockedTags = rawStr
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (!blockedTags.includes(val)) {
    blockedTags.push(val);
  }
  return setValue(searchParams, key, blockedTags.join(","));
}

export function superEncodeURI(str) {
  return new URLSearchParams({ text: str }).toString().replace(/^text=/, "");
}

export function buildQuery(paramsObj) {
  const isBookmarks = paramsObj.user_id != "";
  return Object.entries(paramsObj)
    .filter(([key, val]) => key != "page" && val.length != 0)
    .filter(([key]) => (isBookmarks ? key != "tag_id" : key != "user_id"))
    .map(
      ([key, value]) =>
        `${key}=${
          value == null
            ? ""
            : value.includes("&")
              ? superEncodeURI(value)
              : value
        }`,
    )
    .join("&");
}

export function extractTagNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/");
    const tagIndex = parts.findIndex((part) => part === "tags") + 1;
    return parts[tagIndex];
  } catch (e) {
    console.error("Error parsing URL:", e);
    return null;
  }
}

export function addTagId(searchParams, tagName) {
  if (searchParams["tag_id"] != "") {
    return searchParams;
  }
  return setValue(searchParams, "tag_id", tagName);
}

export function addUserId(searchParams, userId, pseudId) {
  if (searchParams["user_id"] != "") {
    return searchParams;
  }
  const temp = setValue(searchParams, "user_id", userId);
  return setValue(temp, "pseud_id", pseudId);
}

export function addMissingId(searchParams, baseUrl) {
  try {
    const urlObj = new URL(decodeURI(baseUrl));
    const parts = urlObj.pathname.split("/");
    if (parts.includes("tags")) {
      const tagIndex = parts.findIndex((part) => part === "tags") + 1;
      return addTagId(searchParams, parts[tagIndex]);
    } else if (parts.includes("users")) {
      const userIndex = parts.findIndex((part) => part === "users") + 1;
      const pseudId = parts.includes("pseuds")
        ? parts.findIndex((part) => part === "pseuds") + 1
        : userIndex;
      return addUserId(searchParams, parts[userIndex], parts[pseudId]);
    }
    return searchParams;
  } catch (e) {
    console.error("Error parsing URL:", e);
    return null;
  }
}
