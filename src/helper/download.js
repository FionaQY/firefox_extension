/* globals */
import { Document, Packer, Paragraph, TextRun } from "docx";
import { sameText, stripLabel, toInteger } from "./commons.js";
import { extractWorkData } from "./extractor.js";

/* ==========================================================================
 * CONSTANTS
 * ========================================================================== */
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

const NOTES_START = "Notes:";

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

// Build docx
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

function formatTagLines(tagSets) {
  return TAG_MAP.map(([label, key]) => {
    const all = [...new Set(tagSets.flatMap((t) => t?.[key] || []))];
    return all.length ? `${label}: ${all.slice(0, 3).join(", ")}` : null;
  });
}

function buildBodyAndAppendix(works, { headerFor, includeWorkSummary }) {
  const body = [];
  const appendix = [];

  for (const work of works) {
    const chapters = work.chapters || [];

    chapters.forEach((chapter, idx) => {
      const header = headerFor(work, chapter, idx, chapters.length);
      const notes = [];

      if (idx === 0) {
        const summaryAlreadyIncluded = (chapter.notes || []).some((n) =>
          sameText(stripLabel(n, "Summary:"), work.summary),
        );
        if (includeWorkSummary && work.summary && !summaryAlreadyIncluded) {
          notes.push(`Summary: ${work.summary}`);
        }
        if (work.workStartNotes) {
          notes.push(NOTES_START, work.workStartNotes);
        }
      }

      for (const note of chapter.notes || []) {
        if (!note) continue;
        if (/^Summary:/i.test(note)) {
          notes.push(`Summary: ${stripLabel(note, "Summary:")}`);
        } else {
          const clean = stripLabel(note, NOTES_START);
          if (clean) notes.push(NOTES_START, clean);
        }
      }

      if (
        idx === chapters.length - 1 &&
        work.workEndNotes &&
        !sameText(work.workEndNotes, work.workStartNotes)
      ) {
        notes.push(NOTES_START, work.workEndNotes);
      }

      body.push(header, ...chapter.lines);
      if (notes.length) appendix.push(header, ...notes); // only chapters with notes
    });
  }

  return { body, appendix };
}

function assembleLines({
  url,
  title,
  author,
  tagLines,
  statLines,
  summaryText,
  body,
  appendix,
}) {
  return [
    `URL: ${url}`,
    `Title: ${title}`,
    `Author: ${author}`,
    ...tagLines,
    ...statLines,
    summaryText ? `Summary: ${summaryText}` : null,
    DIVIDER,
    ...body,
    ...(appendix.length ? ["", "APPENDIX", DIVIDER, ...appendix] : []),
  ].filter(Boolean);
}

export function workToLines(doc, href) {
  const data = extractWorkData(doc, href);

  const { body, appendix } = buildBodyAndAppendix([data], {
    headerFor: (_w, ch, idx) => formatChapterHeader(idx + 1, ch.heading),
    includeWorkSummary: false,
  });

  const lines = assembleLines({
    url: href,
    title: data.title,
    author: data.author,
    tagLines: formatTagLines([data.tags]),
    statLines: Object.entries(data.stats)
      .filter(([, val]) => val)
      .map(([label, val]) => `${label}: ${val}`),
    summaryText: data.summaryText,
    body,
    appendix,
  });

  return { ...data, lines };
}

export function mergeWorks(works, series) {
  const published = works
    .map((w) => w.stats.Published)
    .filter(Boolean)
    .sort()[0];
  const updated = works
    .map((w) => w.stats.Updated || w.stats.Published)
    .filter(Boolean)
    .sort()
    .at(-1);

  const { body, appendix } = buildBodyAndAppendix(works, {
    headerFor: formatMergedChapterHeader,
    includeWorkSummary: true,
  });

  const chapterCount = works.reduce((sum, w) => sum + w.chapters.length, 0);

  const statLines = [
    published && `Published: ${published}`,
    updated && `Updated: ${updated}`,
    ...SUM_STATS.map(
      (key) =>
        `${key}: ${works
          .reduce((sum, w) => sum + toInteger(w.stats[key]), 0)
          .toLocaleString("en-US")}`,
    ),
    `Chapters: ${chapterCount}`,
  ].filter(Boolean);

  return assembleLines({
    url: works.map((w) => w.url).join(", "),
    title: series?.title || `AO3 Bundle (${works.length} works)`,
    author: [...new Set(works.map((w) => w.author))].join(", "),
    tagLines: formatTagLines(works.map((w) => w.tags)),
    statLines,
    summaryText: series?.summary || null,
    body,
    appendix,
  });
}
