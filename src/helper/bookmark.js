import { fetchDoc, stripLabel, BASE_URL } from "./commons.js";
import { getWorkInfo, getSeriesInfo } from "./extractor.js";
import { parseHtmlFragment } from "./popup.js";

const SELECTORS = {
  FORM: "form#new_bookmark, #bookmark_form_placement form",
  EDIT_METHOD: 'input[name="_method"][value="patch"]',
  NOTES_FIELD: "#bookmark_notes, textarea[name*='notes']",
  PRIVATE_FIELD: 'input[type="checkbox"][name="bookmark[private]"]',
};

const LABELS = {
  SUMMARY: "Summary:",
  TAGS: "Tags",
  CREATE_BOOKMARK: "Create",
};

const MESSAGES = {
  PAGE_DETAILS_UNAVAILABLE: "could not read the page details",
  FORM_UNAVAILABLE: "bookmark form not found (are you logged in?)",
  NOTES_FIELD_UNAVAILABLE: "notes field not found",
};

function buildNotesHtml({ heading, summary, tags, includeAllTags = false }) {
  const container = document.createElement("div");
  container.className = "bookmark-popup";

  const outerDetails = document.createElement("details");
  const outerSummary = document.createElement("summary");
  outerSummary.className = "bookmark-summary-toggle";
  outerDetails.appendChild(outerSummary);

  const headingDiv = document.createElement("div");
  headingDiv.className = "bookmark-heading";
  headingDiv.appendChild(parseHtmlFragment(heading));
  outerDetails.appendChild(headingDiv);

  const summaryDiv = document.createElement("div");
  summaryDiv.className = "bookmark-summary";
  summaryDiv.textContent = summary;
  outerDetails.appendChild(summaryDiv);

  if (tags && Object.keys(tags).length > 0) {
    const tagsDetails = document.createElement("details");
    const tagsSummary = document.createElement("summary");
    tagsSummary.className = "bookmark-summary-toggle";
    tagsSummary.textContent = LABELS.TAGS;
    tagsDetails.appendChild(tagsSummary);

    for (const [category, value] of Object.entries(tags)) {
      if (!value?.length) continue;
      const div = document.createElement("div");
      div.className = "bookmark-tag-item";
      const displayedTags = includeAllTags ? value : value.slice(0, 3);
      div.textContent = `${category}(s): ${displayedTags.join(", ")}`;
      tagsDetails.appendChild(div);
    }
    outerDetails.appendChild(tagsDetails);
  }

  container.append(outerDetails);
  return container.outerHTML;
}

export function getBookmarkNotes(url, doc, isSeries = false) {
  const info = isSeries
    ? getSeriesInfo(doc, url, false)
    : getWorkInfo(doc, url, false);
  if (!info) throw new Error(MESSAGES.PAGE_DETAILS_UNAVAILABLE);

  return buildNotesHtml({
    heading: info.heading,
    summary: stripLabel(info?.summary || "", LABELS.SUMMARY),
    tags: info?.tags,
  });
}

export function populateBookmarkField(
  url,
  doc,
  { makePrivate = false, overrideNotes = false, isSeries = false } = {},
) {
  const form = doc.querySelector(SELECTORS.FORM);
  if (!form) {
    throw new Error(MESSAGES.FORM_UNAVAILABLE);
  }

  // An existing bookmark turns the form into an edit form.
  const isEdit =
    form.querySelector(SELECTORS.EDIT_METHOD) ||
    /\/bookmarks\/\d+/.test(form.getAttribute("action") || "");
  if (isEdit && !overrideNotes) return null;

  const notesField = form.querySelector(SELECTORS.NOTES_FIELD);
  if (!notesField) throw new Error(MESSAGES.NOTES_FIELD_UNAVAILABLE);

  const data = new FormData(form); // includes the CSRF token + defaults
  data.set(notesField.name, getBookmarkNotes(url, doc, isSeries));

  const privateBox = form.querySelector(SELECTORS.PRIVATE_FIELD);
  if (privateBox) data.set(privateBox.name, makePrivate ? "1" : "0");

  return { form, data };
}

// Bookmarks one work (or series) using your logged-in session.
// Returns "created" or "skipped". Throws on failure.
export async function bookmarkWork(
  id,
  { makePrivate = false, overrideNotes = false, isSeries = false } = {},
) {
  const url = `${BASE_URL}/${isSeries ? "series" : "works"}/${id}?view_adult=true`;
  const doc = await fetchDoc(url);

  const populated = populateBookmarkField(url, doc, {
    makePrivate,
    overrideNotes,
    isSeries,
  });
  if (!populated) return "skipped";

  const { form, data } = populated;
  data.set("commit", LABELS.CREATE_BOOKMARK);

  const action = new URL(form.getAttribute("action"), BASE_URL).href;
  const res = await fetch(action, {
    method: "POST",
    body: data,
    credentials: "include",
  });

  if (res.status === 429) throw new Error("rate limited, try again later");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // Rails redirects to the new bookmark on success. A 200 with no redirect
  // means the form was re-rendered with an error.
  if (!res.redirected) throw new Error("AO3 rejected the bookmark");

  return "created";
}
