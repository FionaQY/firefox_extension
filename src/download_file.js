/* globals */
import { Document, Packer, Paragraph, TextRun } from "docx";
import {
  safeFilename,
  sameText,
  stripLabel,
  toInteger,
} from "./helper/commons.js";
import { extractWorkData } from "./helper/extractor.js";

/* ==========================================================================
 * CONSTANTS
 * ========================================================================== */

// Display label -> tag key in extracted work data.
const TAG_MAP = [
  ["Rating", "rating"],
  ["Archive Warning", "warning"],
  ["Category", "category"],
  ["Fandom", "fandom"],
  ["Relationships", "relationship"],
  ["Characters", "character"],
  ["Additional Tags", "freeform"],
];

const SUM_STATS = ["Words", "Comments", "Kudos", "Bookmarks", "Hits"];

const DIVIDER = "----------------------------------------";

export { safeFilename as safe };

const CHAPTER_MARK = "@@CH@@ ";

// Heading text, or "Chapter N" when there is no heading. Always tagged.
function formatChapterHeader(number, heading) {
  return CHAPTER_MARK + (heading || `Chapter ${number}`);
}

function formatMergedChapterHeader(work, chapter, idx, totalChapters) {
  if (totalChapters === 1) {
    return CHAPTER_MARK + work.title;
  }

  if (idx === 0) {
    const hasOwnHeading =
      chapter.heading &&
      chapter.heading.toLowerCase() !== work.title.toLowerCase();

    return (
      CHAPTER_MARK +
      (hasOwnHeading ? `${work.title}: ${chapter.heading}` : work.title)
    );
  }

  return formatChapterHeader(idx + 1, chapter.heading);
}

/* ==========================================================================
 * SINGLE WORK -> LINES
 * ========================================================================== */

export function workToLines(doc, href) {
  const {
    title,
    author,
    url,
    tags,
    summary,
    summaryText,
    stats,
    chapters,
    workStartNotes,
    workEndNotes,
  } = extractWorkData(doc, href);

  // Tag lines, e.g. "Fandom: A, B, C" (first 3 per category).
  const metaLines = TAG_MAP.map(([label, key]) => {
    const list = tags[key];

    return list && list.length
      ? `${label}: ${list.slice(0, 3).join(", ")}`
      : null;
  });

  const statLines = Object.entries(stats)
    .filter(([, val]) => val)
    .map(([label, val]) => `${label}: ${val}`);

  // --- Story body: chapter headers followed by their paragraphs ---
  const body = [];

  chapters.forEach((chapter, idx) => {
    body.push(formatChapterHeader(idx + 1, chapter.heading));
    body.push(...chapter.lines);
  });

  // --- Appendix: work notes plus per-chapter summaries and notes ---
  const appendix = ["APPENDIX", DIVIDER];
  let hasAppendixContent = false;

  if (workStartNotes) {
    appendix.push("Notes:", workStartNotes);
    hasAppendixContent = true;
  }

  chapters.forEach((chapter, idx) => {
    appendix.push(formatChapterHeader(idx + 1, chapter.heading));

    chapter.notes.forEach((note) => {
      // Chapter summaries already carry their own label.
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

  // --- Final output ---
  const lines = [
    `URL: ${href}`,
    `Title: ${title}`,
    `Author: ${author}`,
    ...metaLines,
    ...statLines,
    summaryText ? `Summary: ${summaryText}` : null,
    DIVIDER,
    ...body,
    ...(hasAppendixContent ? ["", ...appendix] : []),
  ].filter(Boolean); // drops the null entries

  // Return structured data too, so mergeWorks() can reuse it.
  return {
    title,
    author,
    lines,
    url,
    tags,
    summary,
    stats,
    chapters,
    workStartNotes,
    workEndNotes,
  };
}

/* ==========================================================================
 * LINES -> DOCX
 * ========================================================================== */

// Builds a .docx from an array of text lines and returns it as a data URL.
export async function linesToDataUrl(lines) {
  const doc = new Document({
    sections: [
      {
        children: lines
          .flatMap((line) => String(line).split(/\n+/)) // one paragraph per line
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

  // Earliest published date and latest updated date (ISO-style strings sort correctly).
  const published = works
    .map((work) => work.stats.Published)
    .filter(Boolean)
    .sort()[0];

  const updated = works
    .map((work) => work.stats.Updated || work.stats.Published)
    .filter(Boolean)
    .sort()
    .at(-1);

  // Series summary: the series title, or a list of the work titles.
  let summaryText = null;

  if (isSeries) {
    summaryText = seriesTitle
      ? `Series: ${seriesTitle}`
      : works.map((work) => work.title).join(", ");
  }

  const body = [];
  const appendix = ["APPENDIX", DIVIDER];

  let globalChapterCount = 0; // chapters are numbered across all works
  let hasAppendixContent = false;

  for (const work of works) {
    const chapters = work.chapters || [];

    chapters.forEach((chapter, idx) => {
      globalChapterCount++;

      const chapterHeader = formatMergedChapterHeader(
        work,
        chapter,
        idx,
        chapters.length,
      );

      body.push(chapterHeader);
      body.push(...chapter.lines);

      appendix.push(chapterHeader);

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
          // Re-add the label so it never appears twice.
          appendix.push(`Summary: ${stripLabel(note, "Summary:")}`);
        } else {
          // Same for "Notes:".
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

  // Combined stats: dates, summed numeric stats, and total chapter count.
  const statLines = [
    published && `Published: ${published}`,
    updated && `Updated: ${updated}`,
    ...SUM_STATS.map(
      (key) =>
        `${key}: ${works
          .reduce((sum, work) => sum + toInteger(work.stats[key]), 0)
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
