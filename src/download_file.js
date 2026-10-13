/* globals */
import { Document, Packer, Paragraph, TextRun } from "docx";
import { getTags } from "./helper/commons";

const TAG_MAP = [
  ["Rating", "rating"],
  ["Archive Warning", "warning"],
  ["Category", "category"],
  ["Fandom", "fandom"],
  ["Relationships", "relationship"],
  ["Characters", "character"],
  ["Additional Tags", "freeform"],
];

const STAT_MAP = [
  ["Published", "dd.published"],
  ["Updated", "dd.status"],
  ["Words", "dd.words"],
  ["Chapters", "dd.chapters"],
  ["Comments", "dd.comments"],
  ["Kudos", "dd.kudos"],
  ["Bookmarks", "dd.bookmarks"],
  ["Hits", "dd.hits"],
];

const SUM_STATS = ["Words", "Comments", "Kudos", "Bookmarks", "Hits"];
const CH_RE = /^Chapter\s+\d+\s*:?\s*/i;
const DIVIDER = "----------------------------------------";

const toNum = (s) => parseInt((s || "").replace(/[^\d]/g, ""), 10) || 0;

const textOf = (el) => (el?.innerText ?? el?.textContent ?? "").trim();

export const safe = (s) => s.replace(/[\\/:*?"<>|]/g, "_").trim();

function getAO3Text(container) {
  if (!container) return "";

  const target =
    container.querySelector("blockquote.userstuff") ||
    container.querySelector("div.userstuff") ||
    container;

  const cloned = target.cloneNode(true);

  cloned
    .querySelectorAll(
      "h3, .heading, .title, .jump, a[href^='#chapter_'], a[href^='#work_']",
    )
    .forEach((el) => el.remove());

  cloned.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  cloned.querySelectorAll("ol, ul").forEach((list) => {
    const isOrdered = list.tagName.toLowerCase() === "ol";
    Array.from(list.children)
      .filter((el) => el.tagName.toLowerCase() === "li")
      .forEach((li, idx) => {
        const prefix = isOrdered ? `${idx + 1}. ` : "- ";
        const itemText = textOf(li);
        const newP = cloned.ownerDocument.createElement("p");
        newP.textContent = `${prefix}${itemText}`;
        list.parentNode?.insertBefore(newP, list);
      });
    list.remove();
  });

  const paragraphs = Array.from(cloned.querySelectorAll("p, blockquote"))
    .map(textOf)
    .filter(Boolean);

  if (paragraphs.length) {
    return paragraphs.join("\n\n").trim();
  }

  return textOf(cloned);
}

function stripLabel(text, label) {
  if (!text) return "";
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`^(?:\\s*${escaped}\\s*)+`, "i"), "").trim();
}

function getSummaryText(container) {
  return stripLabel(getAO3Text(container), "Summary:");
}

function getNotesText(container) {
  return stripLabel(getAO3Text(container), "Notes:");
}

function sameText(a, b) {
  const normalize = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

  return normalize(a) === normalize(b);
}

export function workToLines(doc, href) {
  const data = getTags(doc, href, false);
  const summary = getSummaryText(doc.querySelector(".preface .summary"));

  const title =
    doc.querySelector("h2.title.heading")?.innerText?.trim() || "untitled";

  const author =
    doc.querySelector("h3.byline.heading")?.innerText?.trim() || "unknown";

  const metaLines = TAG_MAP.map(([label, key]) => {
    const list = data.tags[key];

    return list && list.length
      ? `${label}: ${list.slice(0, 3).join(", ")}`
      : null;
  });

  const stats = Object.fromEntries(
    STAT_MAP.map(([label, selector]) => [
      label,
      doc.querySelector(selector)?.innerText?.trim() || "",
    ]),
  );

  const statLines = Object.entries(stats)
    .filter(([, val]) => val)
    .map(([label, val]) => `${label}: ${val}`);

  const workStartNotes = getNotesText(
    doc.querySelector(".preface .notes.module"),
  );
  const workEndNotesEl = doc.querySelector(
    "#work_endnotes, div.work.notes.module",
  );
  const workEndNotes = getNotesText(workEndNotesEl);

  const chapters = [];
  const chNodes = doc.querySelectorAll("#chapters > .chapter");

  if (chNodes.length > 0) {
    chNodes.forEach((chEl) => {
      const headingEl = chEl.querySelector(
        "h3.title, h3.heading, .title.heading",
      );

      const rawHeading = headingEl ? textOf(headingEl) : "";
      const heading = rawHeading.replace(CH_RE, "").trim();
      const userstuff = chEl.querySelector(
        ".userstuff:not(.summary .userstuff):not(.notes .userstuff)",
      );

      const lines = userstuff
        ? Array.from(userstuff.querySelectorAll("p"))
            .filter((p) => !p.closest(".summary, .notes"))
            .map(textOf)
            .filter(Boolean)
        : [];

      // Collect chapter-specific summary and notes while filtering out work-level end notes
      const notes = [];
      const summaryEl = chEl.querySelector(".summary");
      if (summaryEl) {
        const sumText = getSummaryText(summaryEl);
        if (sumText) notes.push(`Summary: ${sumText}`);
      }

      chEl.querySelectorAll(".notes, .end.notes").forEach((notesEl) => {
        if (
          workEndNotesEl &&
          (workEndNotesEl === notesEl || workEndNotesEl.contains(notesEl))
        ) {
          return;
        }
        if (notesEl.classList.contains("summary")) return;

        // Ensure notes element belongs to this specific chapter
        const parentChapter = notesEl.closest(".chapter, div[id^='chapter-']");
        if (
          parentChapter &&
          parentChapter !== chEl &&
          !chEl.contains(notesEl)
        ) {
          return;
        }

        const text = getNotesText(notesEl);
        if (text && !notes.includes(text)) {
          notes.push(text);
        }
      });

      chapters.push({
        heading,
        lines,
        notes,
      });
    });
  } else {
    // Single-chapter work / one-shot.
    const userstuff = doc.querySelector(
      "#workskin div.userstuff, #chapters div.userstuff",
    );

    const lines = userstuff
      ? Array.from(userstuff.querySelectorAll("p"))
          .filter((p) => !p.closest(".summary, .notes"))
          .map(textOf)
          .filter(Boolean)
      : [];

    const chapterRoot =
      doc.querySelector("#chapters") || doc.querySelector("#workskin") || doc;

    const notes = [];
    const summaryEl = chapterRoot.querySelector(".summary");
    if (summaryEl) {
      const sumText = getSummaryText(summaryEl);
      if (sumText) notes.push(`Summary: ${sumText}`);
    }

    chapterRoot.querySelectorAll(".notes, .end.notes").forEach((notesEl) => {
      if (
        workEndNotesEl &&
        (workEndNotesEl === notesEl || workEndNotesEl.contains(notesEl))
      ) {
        return;
      }
      if (notesEl.classList.contains("summary")) return;
      const text = getNotesText(notesEl);
      if (text && !notes.includes(text)) {
        notes.push(text);
      }
    });

    chapters.push({
      heading: title,
      lines,
      notes,
    });
  }

  // --- Document Story Body ---
  const body = [];

  chapters.forEach((chapter, idx) => {
    body.push(
      chapter.heading
        ? `Chapter ${idx + 1}: ${chapter.heading}`
        : `Chapter ${idx + 1}`,
    );

    body.push(...chapter.lines);
  });

  // --- APPENDIX (Single Work Download) ---
  const appendix = ["APPENDIX", DIVIDER];
  let hasAppendixContent = false;

  if (workStartNotes) {
    appendix.push("Notes:", workStartNotes);
    hasAppendixContent = true;
  }

  chapters.forEach((chapter, idx) => {
    const chapterHeader = chapter.heading
      ? `Chapter ${idx + 1}: ${chapter.heading}`
      : `Chapter ${idx + 1}`;

    appendix.push(chapterHeader);

    chapter.notes.forEach((note) => {
      // Chapter summaries already have their own label.
      if (/^Summary:/i.test(note)) {
        appendix.push(note);
      } else {
        appendix.push("Notes:", note);
      }

      hasAppendixContent = true;
    });
  });

  if (workEndNotes && !sameText(workEndNotes, workStartNotes)) {
    appendix.push("Notes:", workEndNotes);
    hasAppendixContent = true;
  }

  const lines = [
    `URL: ${href}`,
    `Title: ${title}`,
    `Author: ${author}`,
    ...metaLines,
    ...statLines,
    summary ? `Summary: ${summary}` : null,
    DIVIDER,
    ...body,
    ...(hasAppendixContent ? ["", ...appendix] : []),
  ].filter(Boolean);

  return {
    title,
    author,
    lines,
    url: href,
    tags: data.tags,
    summary: data.summary,
    stats,
    chapters,
    workStartNotes,
    workEndNotes,
  };
}

export async function linesToDataUrl(lines) {
  const doc = new Document({
    sections: [
      {
        children: lines
          .flatMap((line) => String(line).split(/\n+/))
          .filter((line) => line.trim() !== "")
          .map(
            (line) =>
              new Paragraph({
                children: [new TextRun(line)],
              }),
          ),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });
}

export function mergeWorks(works, isSeries = false, seriesTitle = "") {
  const tagLines = TAG_MAP.map(([label, key]) => {
    const all = [...new Set(works.flatMap((work) => work.tags?.[key] || []))];

    return all.length ? `${label}: ${all.slice(0, 3).join(", ")}` : null;
  });

  const published = works
    .map((work) => work.stats.Published)
    .filter(Boolean)
    .sort()[0];

  const updated = works
    .map((work) => work.stats.Updated || work.stats.Published)
    .filter(Boolean)
    .sort()
    .at(-1);

  // Series bundle: show the series summary.
  // Non-series bundle: do not add a summary at the beginning.
  let summaryText = null;

  if (isSeries) {
    summaryText = seriesTitle
      ? `Series: ${seriesTitle}`
      : works.map((work) => work.title).join(", ");
  }

  const body = [];
  const appendix = ["APPENDIX", DIVIDER];

  let globalChapterCount = 0;
  let hasAppendixContent = false;

  for (const work of works) {
    const chapters = work.chapters || [];

    chapters.forEach((chapter, idx) => {
      globalChapterCount++;

      let displayHeading;

      if (idx === 0) {
        if (
          !chapter.heading ||
          chapter.heading.toLowerCase() === work.title.toLowerCase()
        ) {
          displayHeading = work.title;
        } else {
          displayHeading = `${work.title}: ${chapter.heading}`;
        }
      } else {
        displayHeading = chapter.heading;
      }

      const chapterHeader = displayHeading
        ? `Chapter ${globalChapterCount}: ${displayHeading}`
        : `Chapter ${globalChapterCount}`;

      // Story body.
      body.push(chapterHeader);
      body.push(...chapter.lines);

      // Appendix: every chapter gets one heading.
      appendix.push(chapterHeader);

      // Work-level summary is added only if it isn't already present
      // as the first chapter's summary.
      if (idx === 0 && work.summary) {
        const summaryAlreadyIncluded = chapter.notes.some((note) => {
          const content = stripLabel(note, "Summary:");
          return sameText(content, work.summary);
        });

        if (!summaryAlreadyIncluded) {
          appendix.push(`Summary: ${work.summary}`);
          hasAppendixContent = true;
        }
      }

      // Work-level start notes belong to the first chapter.
      if (idx === 0 && work.workStartNotes) {
        appendix.push("Notes:", work.workStartNotes);
        hasAppendixContent = true;
      }

      // Chapter-specific summaries and notes.
      for (const note of chapter.notes || []) {
        if (!note) continue;

        if (/^Summary:/i.test(note)) {
          // Never add a second Summary: label.
          appendix.push(`Summary: ${stripLabel(note, "Summary:")}`);
        } else {
          // Never add a second Notes: label if one is already present.
          const cleanNote = stripLabel(note, "Notes:");

          if (cleanNote) {
            appendix.push("Notes:", cleanNote);
          }
        }

        hasAppendixContent = true;
      }

      // Work-level end notes belong to the last chapter.
      if (
        idx === chapters.length - 1 &&
        work.workEndNotes &&
        !sameText(work.workEndNotes, work.workStartNotes)
      ) {
        appendix.push("Notes:", work.workEndNotes);
        hasAppendixContent = true;
      }
    });
  }

  const statLines = [
    published && `Published: ${published}`,
    updated && `Updated: ${updated}`,
    ...SUM_STATS.map(
      (key) =>
        `${key}: ${works
          .reduce((sum, work) => sum + toNum(work.stats[key]), 0)
          .toLocaleString("en-US")}`,
    ),
    `Chapters: ${globalChapterCount}`,
  ].filter(Boolean);

  const titleHeader =
    isSeries && seriesTitle
      ? `Title: ${seriesTitle}`
      : `Title: AO3 Bundle (${works.length} works)`;

  return [
    `URL: ${works.map((w) => w.url).join(", ")}`,
    titleHeader,
    `Author: ${[...new Set(works.map((work) => work.author))].join(", ")}`,
    ...tagLines,
    ...statLines,
    summaryText ? `Summary: ${summaryText}` : null,
    DIVIDER,
    ...body,
    ...(hasAppendixContent ? ["", ...appendix] : []),
  ].filter(Boolean);
}
