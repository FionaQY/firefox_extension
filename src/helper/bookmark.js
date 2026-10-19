import { fetchDoc, getTags, getSeriesInfo, stripLabel } from "./commons.js";
import { parseHtmlFragment } from "./popup.js";

const ORIGIN = "https://archiveofourown.org";

function buildNotesHtml({ heading, summary, tags }) {
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
    tagsSummary.textContent = "Tags";
    tagsDetails.appendChild(tagsSummary);

    for (const [key, value] of Object.entries(tags)) {
      if (!value?.length) continue;
      const div = document.createElement("div");
      div.className = "bookmark-tag-item";
      div.textContent = `${key}(s): ${value.slice(0, 3).join(", ")}`;
      tagsDetails.appendChild(div);
    }
    outerDetails.appendChild(tagsDetails);
  }

  container.append(outerDetails);
  return container.outerHTML;
}

export function getBookmarkNotes(url, doc, isSeries = false) {
  const info = isSeries ? getSeriesInfo(doc, url) : getTags(doc, url, false);
  if (!info) throw new Error("could not read the page details");

  return buildNotesHtml({
    heading: info.heading,
    summary: stripLabel(info.summary || "", "Summary:"),
    tags: info.tags,
  });
}

export function populateBookmarkField(
  url,
  doc,
  { makePrivate = false, overrideNotes = false, isSeries = false } = {},
) {
  const form = doc.querySelector(
    "form#new_bookmark, #bookmark_form_placement form",
  );
  if (!form) {
    throw new Error("bookmark form not found (are you logged in?)");
  }

  // An existing bookmark turns the form into an edit form.
  const isEdit =
    form.querySelector('input[name="_method"][value="patch"]') ||
    /\/bookmarks\/\d+/.test(form.getAttribute("action") || "");
  if (isEdit && !overrideNotes) return null;

  const notesField = form.querySelector(
    "#bookmark_notes, textarea[name*='notes']",
  );
  if (!notesField) throw new Error("notes field not found");

  const data = new FormData(form); // includes the CSRF token + defaults
  data.set(notesField.name, getBookmarkNotes(url, doc, isSeries));

  const privateBox = form.querySelector(
    'input[type="checkbox"][name="bookmark[private]"]',
  );
  if (privateBox) data.set(privateBox.name, makePrivate ? "1" : "0");

  return { form, data };
}

// Bookmarks one work (or series) using your logged-in session.
// Returns "created" or "skipped". Throws on failure.
export async function bookmarkWork(
  id,
  { makePrivate = false, overrideNotes = false, isSeries = false } = {},
) {
  const url = isSeries ? `${ORIGIN}/series/${id}` : `${ORIGIN}/works/${id}`;
  const doc = await fetchDoc(`${url}?view_adult=true`);

  const populated = populateBookmarkField(url, doc, {
    makePrivate,
    overrideNotes,
    isSeries,
  });
  if (!populated) return "skipped";

  const { form, data } = populated;
  data.set("commit", "Create");

  const action = new URL(form.getAttribute("action"), ORIGIN).href;
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
