/* globals browser */
import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  PageNumber,
  Packer,
  Paragraph,
  SectionType,
  TextRun,
  VerticalAlignSection,
  ImageRun,
} from "docx";
import JSZip from "jszip";
import {
  BASE_URL,
  fetchDoc,
  safeFilename,
  sameText,
  stripLabel,
  toInteger,
  textOf,
} from "./commons.js";
import { createNotifPopup, getSettings } from "./popup.js";
import { getDocxFormat } from "./document_format.js";
import { extractWorkData, getSeriesInfo, workInfo } from "./extractor.js";

/* ==========================================================================
 * SAVED "BUNDLE THIS SERIES" CHOICES
 * ========================================================================== */

const BUNDLE_KEY = "bundleSeriesIds";
let bundleWriteQueue = Promise.resolve();

/** Load the set of series IDs the user marked to be bundled. */
export async function getBundleIds() {
  const { [BUNDLE_KEY]: ids, settings = {} } = await browser.storage.local.get([
    BUNDLE_KEY,
    "settings",
  ]);
  if (Array.isArray(ids)) return new Set(ids);

  const legacyIds = settings[BUNDLE_KEY];
  if (!Array.isArray(legacyIds)) return new Set();

  await browser.storage.local.set({ [BUNDLE_KEY]: legacyIds });
  return new Set(legacyIds);
}

/** Save or clear one series choice without racing other checkbox changes. */
export function setBundleId(id, on) {
  const update = async () => {
    const ids = await getBundleIds();
    if (on) ids.add(id);
    else ids.delete(id);
    await browser.storage.local.set({ [BUNDLE_KEY]: [...ids] });
  };

  bundleWriteQueue = bundleWriteQueue.catch(() => {}).then(update);
  return bundleWriteQueue;
}

const TAG_KEYS = [
  "rating",
  "warning",
  "category",
  "fandom",
  "relationship",
  "character",
  "freeform",
];

const SUM_STATS = ["Words", "Comments", "Kudos", "Bookmarks", "Hits"];
const NOTES_START = "Notes:";
const BODY_LINE_HEIGHT = 1.2;

const PAGE = {
  size: { width: 8640, height: 12960 },
  margin: {
    left: 1080,
    right: 936,
    top: 1008,
    bottom: 1080,
    gutter: 144,
    header: 504,
    footer: 576,
  },
};

/* ------------------------------------------------------------------ */
/* Chapter / appendix assembly                                         */
/* ------------------------------------------------------------------ */

// Return a chapter heading or its generated chapter number.
function formatChapterHeader(number, heading) {
  return heading || `Chapter ${number}`;
}

// Format chapter headings differently for merged works and their first chapter.
function formatMergedChapterHeader(work, chapter, idx, totalChapters) {
  if (totalChapters === 1) return work.title;

  if (idx === 0) {
    const hasOwnHeading =
      chapter.heading &&
      chapter.heading.toLowerCase() !== work.title.toLowerCase();

    return hasOwnHeading ? `${work.title}: ${chapter.heading}` : work.title;
  }

  return formatChapterHeader(idx + 1, chapter.heading);
}

// Convert work metadata into document appendix.
function getWorkMetadataNotes(work) {
  const notes = work.url ? [`URL: ${work.url}`] : [];
  const tags = Object.entries(work.tags || {}).filter(
    ([category, values]) =>
      category !== "relationship" && category !== "series" && values?.length,
  );

  if (tags.length) {
    notes.push(
      "Tags:",
      ...tags.map(
        ([category, values]) =>
          `${category[0].toUpperCase()}${category.slice(1)}: ${values.join(", ")}`,
      ),
    );
  }

  const series = work.series?.length
    ? work.series.map(({ title, part }) =>
        part ? `Part ${part} of ${title}` : title,
      )
    : work.tags?.series || [];
  if (series.length) notes.push(`Series: ${series.join(", ")}`);

  const relationships = work.tags?.relationship || [];
  if (relationships.length) {
    notes.push(`Relationships: ${relationships.join(", ")}`);
  }

  return notes;
}

// Assemble chapter content and corresponding notes for a set of works.
function buildBodyAndAppendix(works, { headerFor, includeWorkSummary }) {
  const chapters = [];
  const appendix = [];

  for (const work of works) {
    const workChapters = work.chapters || [];

    workChapters.forEach((chapter, idx) => {
      const heading = headerFor(work, chapter, idx, workChapters.length);
      const notes = [];

      if (idx === 0) {
        const workSummary = getInfoSummary(work.summaryText);
        if (includeWorkSummary && workSummary) {
          notes.push(`Summary: ${workSummary}`);
        }
        if (includeWorkSummary) {
          notes.push(...getWorkMetadataNotes(work));
        }
        if (work.workStartNotes) {
          notes.push(NOTES_START, work.workStartNotes);
        }
      }

      for (const note of chapter.notes || []) {
        if (!note) continue;
        if (
          idx === 0 &&
          includeWorkSummary &&
          work.summaryText &&
          /^Summary:/i.test(note) &&
          sameText(stripLabel(note, "Summary:"), work.summaryText)
        ) {
          continue;
        }
        if (/^Summary:/i.test(note)) {
          notes.push(`Summary: ${stripLabel(note, "Summary:")}`);
        } else {
          const clean = stripLabel(note, NOTES_START);
          if (clean) notes.push(NOTES_START, clean);
        }
      }

      if (
        idx === workChapters.length - 1 &&
        work.workEndNotes &&
        !sameText(work.workEndNotes, work.workStartNotes)
      ) {
        notes.push(NOTES_START, work.workEndNotes);
      }

      chapters.push({ heading, paragraphs: chapter.lines || [] });
      if (notes.length) appendix.push({ heading, notes });
    });
  }

  return { chapters, appendix };
}

// Extract a four-digit year from a date-like value.
function getYear(value) {
  return String(value || "").match(/\b\d{4}\b/)?.[0] || "";
}

// Check whether the chapter count represents a single-chapter work.
function isSingleChapter(value) {
  const chapters = String(value || "").trim();
  return !chapters || chapters === "1" || chapters === "1/1";
}

// Check whether a multi-chapter work has reached its final chapter.
function isCompleteMultiChapterWork(value) {
  const [current, total] = String(value || "")
    .split("/")
    .map((part) => Number(part.trim()));
  return total > 1 && current === total;
}

// Get the completed year for work
function getCompletedYear(stats) {
  const chapters = String(stats.Chapters || "").trim();
  if (isSingleChapter(chapters)) return "";

  const publishedYear = getYear(stats.Published);
  const updatedYear = getYear(stats.Updated || stats.Published);
  if (!updatedYear) return "";

  if (chapters.includes("/")) {
    return isCompleteMultiChapterWork(chapters) ? updatedYear : "";
  }
  return updatedYear !== publishedYear ? updatedYear : "";
}

// Omit duplicate series descriptions from the work summary.
function getInfoSummary(summaryText) {
  const summary = String(summaryText || "").trim();
  return /^Series:/i.test(summary) ? "" : summary;
}

//  three blank lines, the details, with the same blank-line spacing.
// Format the title-page metadata and summary as display lines.
function makeInfoLines({
  tags,
  stats,
  summaryText,
  seriesTitle,
  completedYear,
}) {
  const lines = ["", "", "", ""];
  const publishedYear = getYear(stats.Published);

  lines.push(`First published in ${publishedYear}`);
  if (
    !isSingleChapter(stats.Chapters) &&
    completedYear &&
    completedYear !== publishedYear
  ) {
    lines.push(`Completed in ${completedYear}`);
  }

  if (seriesTitle) lines.push("", "Series:", seriesTitle, "");

  const fandoms = tags?.fandom || [];
  if (fandoms.length) lines.push(`Based on ${fandoms.slice(0, 3).join(", ")}`);
  if (tags?.relationship?.length) {
    lines.push(`Relationships: ${tags.relationship.slice(0, 3).join(", ")}`);
  }
  if (tags?.rating?.length) {
    lines.push(`Rating: ${tags.rating.slice(0, 3).join(", ")}`);
  }

  for (const label of ["Words", "Hits", "Kudos"]) {
    lines.push(`${label}: ${stats[label] || ""}`);
  }

  const infoSummary = getInfoSummary(summaryText);
  if (infoSummary) {
    lines.push("", "***", "", ...splitParagraphs(infoSummary));
  }
  return lines;
}

// Split multiline text into trimmed, nonempty paragraphs.
function splitParagraphs(value) {
  return String(value || "")
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

const SCENE_BREAKS = new Set([
  "~",
  "~~~",
  "- - -",
  "---",
  "✦",
  ".::.",
  "—",
  "**",
  "****",
  "*****",
  "******",
  "*******",
  "*",
  ".",
]);

// Normalize story paragraph spacing and scene-break markers.
function normalizeStoryParagraph(value) {
  const source = String(value)
    .replace(/\u00a0/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
  if (SCENE_BREAKS.has(source)) return "***";
  return source.replace(/--/g, "—");
}

// Normalize a note paragraph and strip leading quote or heading markers.
function normalizeNoteParagraph(value) {
  let text = normalizeStoryParagraph(value);
  while (text.startsWith(">") || text.startsWith("#")) {
    text = text.slice(1).trim();
  }
  return text;
}

/* ------------------------------------------------------------------ */
/* Styles (the macro's Heading 1-5 and Subtitle)                       */
/* ------------------------------------------------------------------ */

// Build document styles from the selected fonts and size settings.
function makeStyles(fonts, sizes) {
  // Build a run style using the selected heading font and point size.
  const run = (points, extra = {}) => ({
    font: fonts.headings,
    size: Math.round(points * 2),
    bold: false,
    italics: false,
    color: "000000",
    ...extra,
  });

  // Build a centered paragraph style with consistent Word spacing defaults.
  const paragraph = (extra = {}) => ({
    alignment: AlignmentType.CENTER,
    indent: { left: 0, right: 0, firstLine: 0 },
    keepNext: false,
    keepLines: true,
    ...extra,
    spacing: {
      before: 0,
      after: 0,
      line: 240,
      lineRule: "auto",
      ...(extra.spacing || {}),
    },
  });

  // Pair a heading run style with its outline and paragraph settings.
  const heading = (outlineLevel, runOpts, paraOpts) => ({
    run: runOpts,
    paragraph: { ...paragraph(paraOpts), outlineLevel },
  });

  return {
    default: {
      document: {
        run: { font: fonts.body, size: Math.round(sizes.body * 2) },
      },
      // Chapter titles, cover title
      heading1: heading(0, run(sizes.chapterTitle), {
        keepNext: true,
        spacing: { after: 600 },
      }),
      // Interior title page: title
      heading2: heading(1, run(sizes.title), {
        keepNext: true,
        spacing: { after: 360 },
      }),
      // Interior title page: author
      heading3: heading(2, run(sizes.author), {}),
      // Appendix chapter headings
      heading4: heading(3, run(sizes.appendixTitle, { bold: true }), {
        keepNext: true,
        spacing: { before: 480, after: 240 },
      }),
      // Defined for parity with the macro (not used by the generator)
      heading5: heading(4, run(sizes.body, { bold: true, italics: true }), {
        alignment: AlignmentType.LEFT,
        keepNext: true,
        spacing: { before: 280, after: 80 },
      }),
    },
    paragraphStyles: [
      {
        id: "Subtitle",
        name: "Subtitle",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: run(sizes.info),
        paragraph: paragraph({
          keepLines: false,
          spacing: {
            line: 252, // 12.6pt * 20 twips
            lineRule: "exact",
          },
        }),
      },
    ],
  };
}

const HEADING_LEVELS = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
};

// Formatting comes from the style, so editing the style in Word restyles all.
// Create a heading paragraph at the requested hierarchy level.
function makeHeading(text, level, runOptions = {}) {
  return new Paragraph({
    heading: HEADING_LEVELS[level],
    children: [new TextRun({ text, ...runOptions })],
  });
}

// Create a metadata paragraph using the subtitle style.
function makeInfoParagraph(text) {
  return new Paragraph({
    style: "Subtitle",
    children: [new TextRun({ text })],
  });
}

/* ------------------------------------------------------------------ */
/* Body paragraphs and footers                                         */
/* ------------------------------------------------------------------ */

// Create a paragraph with shared typography and layout options.
function makeTextParagraph(text, font, size, options = {}) {
  const {
    alignment,
    before = 0,
    after = 0,
    firstLine,
    bold,
    keepNext,
  } = options;

  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: { name: font },
        size: Math.round(size * 2),
        bold,
        color: "000000",
      }),
    ],
    alignment,
    spacing: {
      before,
      after,
      ...(options.line
        ? { line: options.line, lineRule: options.lineRule || "exact" }
        : {}),
    },
    ...(firstLine ? { indent: { firstLine } } : {}),
    keepNext,
    keepLines: options.keepLines,
    widowControl: options.widowControl,
  });
}

// Create a justified, first-line-indented story paragraph.
function makeBodyParagraph(text, font, sizes) {
  return makeTextParagraph(text, font, sizes.body, {
    alignment: AlignmentType.JUSTIFIED,
    firstLine: 288,
    line: sizes.body * BODY_LINE_HEIGHT * 20,
    widowControl: true,
  });
}

// Create a left-aligned paragraph for notes and appendix content.
function makeNoteParagraph(text, font, sizes, options = {}) {
  const { fontSize = sizes.notes, ...paragraphOptions } = options;
  return makeTextParagraph(text, font, fontSize, {
    alignment: AlignmentType.LEFT,
    firstLine: 288,
    line: fontSize * BODY_LINE_HEIGHT * 20,
    ...paragraphOptions,
  });
}

// Odd pages: number on the right. Even pages: number on the left.
// First page of a section: no number (the macro blanks the first-page footer).
// Create odd, even, and blank first-page footer definitions.
function makePageFooters(font) {
  // Create a page-number footer with the requested alignment.
  const createFooter = (alignment) =>
    new Footer({
      children: [
        new Paragraph({
          alignment,
          children: [
            new TextRun({
              children: [PageNumber.CURRENT],
              font: { name: font },
              size: 18,
              color: "000000",
            }),
          ],
        }),
      ],
    });

  return {
    default: createFooter(AlignmentType.RIGHT),
    even: createFooter(AlignmentType.LEFT),
    first: new Footer({ children: [new Paragraph("")] }),
  };
}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

const IMG_RE = /\u27E6IMG:([^\u27E7]+)\u27E7/;
const IMG_SPLIT = /(\u27E6IMG:[^\u27E7]+\u27E7)/;
const IMG_ALL = /\u27E6IMG:([^\u27E7]+)\u27E7/g;
const IMAGE_MAX = { width: 420, height: 600 };

function collectImageUrls(data) {
  const urls = new Set();
  for (const chapter of data.chapters) {
    for (const paragraph of chapter.paragraphs) {
      for (const match of String(paragraph).matchAll(IMG_ALL)) {
        urls.add(match[1]);
      }
    }
  }
  return urls;
}

// Download one image, convert unsupported formats to PNG, and scale it to fit.
async function loadImage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  let blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  try {
    const { width, height } = bitmap;
    let type = { "image/jpeg": "jpg", "image/png": "png" }[blob.type] || "";
    let data;

    if (type) {
      data = Uint8Array.from(new Uint8Array(await blob.arrayBuffer()));
    } else {
      // Word can't use webp/gif/etc., so redraw as PNG.
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(bitmap, 0, 0);

      // A string crosses the page/extension boundary safely; blobs and buffers don't.
      const base64 = canvas.toDataURL("image/png").split(",")[1];
      const binary = atob(base64);
      data = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
      type = "png";
    }

    const scale = Math.min(
      1,
      IMAGE_MAX.width / width,
      IMAGE_MAX.height / height,
    );
    return {
      data,
      type,
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };
  } finally {
    bitmap.close?.();
  }
}

// Load every image a document uses. Failed ones are left out and become "[image]".
async function loadImages(data) {
  const images = new Map();
  for (const url of collectImageUrls(data)) {
    try {
      images.set(url, await loadImage(url));
    } catch (error) {
      console.warn(`AO3 download: could not load image ${url}`, error);
    }
  }
  return images;
}

// Create a centered paragraph holding one image.
function makeImageParagraph({ data, type, width, height }) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
    keepLines: true,
    children: [new ImageRun({ type, data, transformation: { width, height } })],
  });
}

// Turn one story paragraph into text paragraphs and image paragraphs.
function makeStoryParagraphs(rawText, fonts, sizes, images) {
  if (!IMG_RE.test(rawText)) {
    const text = normalizeStoryParagraph(rawText);
    return text ? [makeBodyParagraph(text, fonts.body, sizes)] : [];
  }

  const out = [];
  for (const part of rawText.split(IMG_SPLIT)) {
    const match = part.match(IMG_RE);
    if (match) {
      const image = images.get(match[1]);
      out.push(
        image
          ? makeImageParagraph(image)
          : makeBodyParagraph("[image]", fonts.body, sizes),
      );
    } else {
      const text = normalizeStoryParagraph(part);
      if (text) out.push(makeBodyParagraph(text, fonts.body, sizes));
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

// Build a document section for one work chapter.
function makeChapterSection(chapter, fonts, sizes, page, footers, images) {
  const children = [
    makeHeading(chapter.heading, 1),
    ...chapter.paragraphs
      .flatMap(splitParagraphs)
      .flatMap((text) => makeStoryParagraphs(text, fonts, sizes, images)),
  ];

  return {
    properties: { type: SectionType.NEXT_PAGE, page, titlePage: true },
    footers,
    children,
  };
}

// Build the notes appendix section while honoring tag and relationship settings.
function makeAppendixSection(appendix, fonts, sizes, page, format, footers) {
  const children = [
    makeHeading("Author's Notes", 1),
    makeNoteParagraph(
      "A collection of Notes and Summaries from the original published works on archiveofourown.org",
      fonts.body,
      sizes,
      { fontSize: sizes.body },
    ),
    new Paragraph(""),
  ];

  for (const entry of appendix) {
    if (entry.heading) children.push(makeHeading(entry.heading, 4));

    let insideTags = false;
    for (const note of entry.notes || []) {
      if (/^Tags:/i.test(note)) {
        insideTags = true;
        if (!format.includeTags) continue;
      } else if (/^(Notes|Summary|URL|Relationships):/i.test(note)) {
        insideTags = false;
      } else if (insideTags && !format.includeTags) {
        continue;
      }

      if (/^Relationships:/i.test(note) && !format.includeRelationships) {
        continue;
      }

      const isLabel = /^(Notes|Summary|URL|Tags|Relationships):/i.test(note);
      const label = isLabel
        ? note.match(/^(Notes|Summary|URL|Tags|Relationships):/i)[0]
        : "";
      const content = isLabel ? note.slice(label.length).trim() : note;

      if (label) {
        children.push(
          makeNoteParagraph(label, fonts.notes, sizes, {
            alignment: AlignmentType.LEFT,
            before: 120,
            after: 60,
            firstLine: undefined,
            bold: true,
          }),
        );
      }

      for (const paragraph of splitParagraphs(content)) {
        const text = normalizeNoteParagraph(paragraph);
        if (text) children.push(makeNoteParagraph(text, fonts.notes, sizes));
      }
    }
  }

  return {
    properties: { type: SectionType.NEXT_PAGE, page, titlePage: true },
    footers,
    children,
  };
}

// Section 2 in the macro carries hidden "Intentionally Blank" text, centered.
// Build a blank section, optionally containing hidden centered text.
function makeBlankSection(page, { hiddenText } = {}) {
  return {
    properties: {
      type: SectionType.NEXT_PAGE,
      page,
      ...(hiddenText ? { verticalAlign: VerticalAlignSection.CENTER } : {}),
    },
    children: [
      hiddenText
        ? new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: hiddenText, vanish: true })],
          })
        : new Paragraph(""),
    ],
  };
}

// Assemble the complete DOCX document from prepared work data and formatting.
function buildDocument(data, format, images) {
  const { fonts, sizes } = format;
  const page = {
    ...PAGE,
    margin: { ...PAGE.margin, ...format.page.margin },
  };
  const coverPage = {
    properties: {
      page,
      verticalAlign: VerticalAlignSection.CENTER,
    },
    children: [
      // Heading 1 with the cover's larger size, as in the macro
      makeHeading(data.title, 1, {
        size: Math.round(sizes.coverTitle * 2),
      }),
    ],
  };

  const titlePage = {
    properties: {
      type: SectionType.NEXT_PAGE,
      page,
      verticalAlign: VerticalAlignSection.CENTER,
    },
    children: [makeHeading(data.title, 2), makeHeading(data.author, 3)],
  };

  const infoPage = {
    properties: {
      type: SectionType.NEXT_PAGE,
      page,
      verticalAlign: VerticalAlignSection.CENTER,
    },
    children: makeInfoLines(data).map(makeInfoParagraph),
  };

  const sections = [
    coverPage,
    makeBlankSection(page, { hiddenText: "Intentionally Blank" }),
    titlePage,
    infoPage,
    ...data.chapters.map((chapter) =>
      makeChapterSection(
        chapter,
        fonts,
        sizes,
        page,
        makePageFooters(fonts.body),
        images,
      ),
    ),
  ];

  if (data.appendix.length) {
    sections.push(
      makeAppendixSection(
        data.appendix,
        fonts,
        sizes,
        page,
        format,
        makePageFooters(fonts.body),
      ),
    );
  }

  return new Document({
    title: data.title,
    creator: data.author,
    evenAndOddHeaderAndFooters: true,
    styles: makeStyles(fonts, sizes),
    sections,
  });
}

/* ------------------------------------------------------------------ */
/* Post-processing: things docx has no API for                         */
/* ------------------------------------------------------------------ */

// Elements that must precede <w:mirrorMargins/> in settings.xml (schema order).
const SETTINGS_BEFORE_MIRROR = [
  "writeProtection",
  "view",
  "zoom",
  "removePersonalInformation",
  "removeDateAndTime",
  "doNotDisplayPageBoundaries",
  "displayBackgroundShape",
  "printPostScriptOverText",
  "printFractionalCharacterWidth",
  "printFormsData",
  "embedTrueTypeFonts",
  "embedSystemFonts",
  "saveSubsetFonts",
  "saveFormsData",
];

// Insert the mirror-margins setting in schema order if it is not already present.
function addMirrorMargins(xml) {
  if (/<w:mirrorMargins\b/.test(xml)) return xml;

  const earlier = new RegExp(
    `<w:(?:${SETTINGS_BEFORE_MIRROR.join("|")})\\b[^>]*/>`,
    "g",
  );
  let insertAt = -1;
  for (const match of xml.matchAll(earlier)) {
    insertAt = match.index + match[0].length;
  }

  if (insertAt === -1) {
    const root = xml.match(/<w:settings\b[^>]*>/);
    if (!root) return xml;
    insertAt = root.index + root[0].length;
  }

  return `${xml.slice(0, insertAt)}<w:mirrorMargins/>${xml.slice(insertAt)}`;
}

// Patch a generated DOCX package with the required Word settings.
async function patchPackage(base64) {
  const zip = await JSZip.loadAsync(base64, { base64: true });

  const settingsFile = zip.file("word/settings.xml");
  if (settingsFile) {
    zip.file(
      "word/settings.xml",
      addMirrorMargins(await settingsFile.async("string")),
    );
  }

  return zip.generateAsync({
    type: "base64",
    compression: "DEFLATE",
  });
}

// Build a formatted DOCX package and return its base64 content.
async function documentToBase64(data) {
  const settings = await getSettings();
  const format = getDocxFormat(settings.general || {});
  const images = await loadImages(data);
  const base64 = await Packer.toBase64String(
    buildDocument(data, format, images),
  );
  return patchPackage(base64);
}

// Build a DOCX document and return its downloadable data URL.
export async function documentToDataUrl(data) {
  const base64 = await documentToBase64(data);
  return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
}

// Package multiple generated DOCX documents into a downloadable ZIP data URL.
export async function documentsToZipDataUrl(entries) {
  const zip = new JSZip();
  for (const { path, document } of entries) {
    zip.file(path, await documentToBase64(document), { base64: true });
  }
  const base64 = await zip.generateAsync({
    type: "base64",
    compression: "DEFLATE",
  });
  return `data:application/zip;base64,${base64}`;
}

/* ------------------------------------------------------------------ */
/* Data assembly                                                       */
/* ------------------------------------------------------------------ */

// Combine category tag arrays while removing duplicate tags.
function combineTags(tagSets) {
  return Object.fromEntries(
    TAG_KEYS.map((key) => [
      key,
      [...new Set(tagSets.flatMap((tags) => tags?.[key] || []))],
    ]),
  );
}

// Create the common document data structure used by the DOCX builder.
function createDocumentData({
  url,
  title,
  author,
  tags,
  stats,
  summaryText,
  seriesTitle,
  completedYear = "",
  chapters,
  appendix,
}) {
  return {
    url,
    title,
    author,
    tags,
    stats,
    summaryText,
    seriesTitle,
    completedYear,
    chapters,
    appendix,
  };
}

// Format series membership using the part number extracted from the work page.
function getWorkSeriesTitle(work) {
  return (
    work.series
      ?.map(({ title, part }) => (part ? `Part ${part} of ${title}` : title))
      .join(", ") ||
    work.tags?.series?.join(", ") ||
    ""
  );
}

// Format extracted work data into the input expected by the DOCX builder.
export function workToDocument(work) {
  const { chapters, appendix } = buildBodyAndAppendix([work], {
    headerFor: (_work, chapter, idx) =>
      formatChapterHeader(idx + 1, chapter.heading),
    includeWorkSummary: false,
  });
  const summary = getInfoSummary(work.summaryText);
  const formattedAppendixNotes = [
    ...(summary ? [`Summary: ${summary}`] : []),
    ...getWorkMetadataNotes(work),
  ];
  const formattedAppendix = formattedAppendixNotes.length
    ? [{ notes: formattedAppendixNotes }, ...appendix]
    : appendix;

  return createDocumentData({
    url: work.url,
    title: work.title,
    author: work.author,
    tags: work.tags,
    stats: work.stats,
    summaryText: work.summaryText,
    seriesTitle: getWorkSeriesTitle(work),
    completedYear: getCompletedYear(work.stats),
    chapters,
    appendix: formattedAppendix,
  });
}

// Return a shared completion year when every merged work finished together.
function completedYear(works) {
  const completeWorks = works.filter((work) =>
    isCompleteMultiChapterWork(work.stats.Chapters),
  );
  if (!completeWorks.length || completeWorks.length !== works.length) return "";

  const years = completeWorks.map((work) => getYear(work.stats.Updated));
  return years.every(Boolean) && new Set(years).size === 1 ? years[0] : "";
}

// Merge work metadata and chapters into one document, optionally for a series.
export function mergeWorks(works, series) {
  const published = works
    .map((work) => work.stats.Published)
    .filter(Boolean)
    .sort()[0];
  const updated = works
    .map((work) => work.stats.Updated || work.stats.Published)
    .filter(Boolean)
    .sort()
    .at(-1);
  const tags = combineTags(works.map((work) => work.tags));
  const { chapters, appendix } = buildBodyAndAppendix(works, {
    headerFor: formatMergedChapterHeader,
    includeWorkSummary: true,
  });

  const completeYear = completedYear(works);
  const stats = {
    Published: published,
    Updated: completeYear || updated,
    ...Object.fromEntries(
      SUM_STATS.map((key) => [
        key,
        works
          .reduce((sum, work) => sum + toInteger(work.stats[key]), 0)
          .toLocaleString("en-US"),
      ]),
    ),
    Chapters: works.reduce((sum, work) => sum + work.chapters.length, 0),
  };

  return createDocumentData({
    url: works.map((work) => work.url).join(", "),
    title: series?.title || works[0]?.title || "Untitled",
    author: [...new Set(works.map((work) => work.author))].join(", "),
    tags,
    stats,
    summaryText: series?.summary || "",
    seriesTitle: series?.title,
    completedYear: completeYear,
    chapters,
    appendix,
  });
}

/* ------------------------------------------------------------------ */
/* Download workflows                                                  */
/* ------------------------------------------------------------------ */

const DOWNLOAD_DELAY_MS = 3000;
const LISTING_DOWNLOAD_DELAY_MS = 20_000;
const MAX_SERIES_PAGES = 50;
const DOWNLOAD_TYPE = { WORK: "work", SERIES: "series" };
const DOWNLOAD_MESSAGE = "downloadDoc";
const SERIES_SELECTORS = {
  WORK_BLURB: "li.work.blurb.group",
  NEXT_PAGE: "ol.pagination li.next a",
};
const LISTING_SELECTORS = {
  WORK_BLURBS: ".work.blurb.group, li.blurb.group",
  SERIES_LINK: "h4.heading a[href^='/series/']",
  NEXT_PAGE: "ol.pagination li.next a",
};

// Create an empty result tally. failedItems holds a name for each failure.
function createTally() {
  return { downloaded: 0, skipped: 0, failed: 0, failedItems: [] };
}

// Record one failed item (a work, series or bundle) in the tally.
function recordFailure(tally, name, count = 1) {
  tally.failed += count;
  tally.failedItems.push(name);
}

// Pause between AO3 requests to reduce the chance of rate limiting.
function waitForDownloadDelay(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

// Run asynchronous work sequentially with a pause between items.
export async function forEachPaced(items, fn, delayMs = DOWNLOAD_DELAY_MS) {
  for (let i = 0; i < items.length; i++) {
    await fn(items[i], i);
    if (i < items.length - 1) await waitForDownloadDelay(delayMs);
  }
}

// Fetch and convert a full work into the extension's document model.
async function loadWork(id) {
  const url = `${BASE_URL}/works/${id}`;
  const doc = await fetchDoc(`${url}?view_full_work=true&view_adult=true`);
  return extractWorkData(doc, url);
}

// Load work jobs, apply shared filters, and either download or retain each work.
async function processWorkJobs(
  jobs,
  {
    bundle,
    notInSeries,
    setStatus,
    statusForWork,
    shouldRetainWork = () => false,
    onWorkSkipped = () => {},
    onWorkProcessed = () => {},
    delayMs = DOWNLOAD_DELAY_MS,
    errorMessage,
  },
) {
  const retainedWorks = [];
  const tally = createTally();

  await forEachPaced(
    jobs,
    async ({ id, title, author }, index) => {
      setStatus(statusForWork(title, index, jobs.length));
      try {
        const work = await loadWork(id);
        if (notInSeries && work.tags?.series?.length) {
          tally.skipped++;
          onWorkSkipped(title);
          onWorkProcessed(id);
          return;
        }

        if (bundle || shouldRetainWork(id)) {
          retainedWorks.push({ ...work, id });
        } else {
          await downloadDoc(
            workToDocument(work),
            getWorkFilename(work.title || title, work.author || author),
            jobs.length === 1,
          );
          tally.downloaded++;
        }
        onWorkProcessed(id);
      } catch (error) {
        recordFailure(tally, title || `work ${id}`);
        createNotifPopup(errorMessage(title, error));
        setStatus(`Failed: ${title}`);
      }
    },
    delayMs,
  );

  return { retainedWorks, tally };
}

// Download retained works as one bundle and include the result in the tally.
async function downloadWorksBundle(
  works,
  { label, setStatus, tally, errorMessage, singleWorkAsDocx = false },
) {
  if (!works.length) return;

  setStatus(`Building ${label} bundle...`);
  try {
    if (singleWorkAsDocx && works.length === 1) {
      const [work] = works;
      await downloadDoc(
        workToDocument(work),
        getWorkFilename(work.title, work.author),
        true,
      );
    } else {
      await downloadBundle(works, null);
    }
    tally.downloaded += works.length;
  } catch (error) {
    recordFailure(tally, `${label} bundle`, works.length);
    createNotifPopup(errorMessage(error));
  }
}

// Download every unique work and series found across an AO3 listing's pages.
export async function downloadAllListingWorks(
  url,
  { label, bundle, notInSeries, setStatus },
) {
  const startUrl = new URL(url);
  const works = new Map();
  const seriesMap = new Map();
  const visitedPages = new Set();
  let pageUrl = startUrl.href;

  while (pageUrl) {
    const currentPage = new URL(pageUrl);
    if (
      currentPage.origin !== BASE_URL ||
      currentPage.pathname !== startUrl.pathname
    ) {
      throw new Error("AO3 listing pagination linked to an unexpected page");
    }
    if (visitedPages.has(currentPage.href)) {
      throw new Error("AO3 listing pagination repeated a page");
    }
    visitedPages.add(currentPage.href);

    setStatus(
      `Reading ${label} (page ${currentPage.searchParams.get("page") || 1})`,
    );
    const doc = await fetchDoc(currentPage.href);
    for (const blurb of doc.querySelectorAll(LISTING_SELECTORS.WORK_BLURBS)) {
      const info = workInfo(blurb);
      if (info) {
        if (!works.has(info.id)) works.set(info.id, info);
        continue;
      }
      const link = blurb.querySelector(LISTING_SELECTORS.SERIES_LINK);
      const id = link?.getAttribute("href")?.match(/\/series\/(\d+)/)?.[1];
      if (id && !seriesMap.has(id)) {
        seriesMap.set(id, { id, title: textOf(link) });
      }
    }

    const nextLink = doc.querySelector(LISTING_SELECTORS.NEXT_PAGE);
    pageUrl = nextLink
      ? new URL(nextLink.getAttribute("href"), currentPage).href
      : "";

    if (pageUrl) {
      const nextPage = new URL(pageUrl);
      if (
        nextPage.origin !== BASE_URL ||
        nextPage.pathname !== startUrl.pathname
      ) {
        throw new Error("AO3 listing pagination linked to an unexpected page");
      }
      if (visitedPages.has(nextPage.href)) {
        throw new Error("AO3 listing pagination repeated a page");
      }
      await waitForDownloadDelay(LISTING_DOWNLOAD_DELAY_MS);
    }
  }

  if (!works.size && !seriesMap.size) {
    throw new Error(`No works found in ${label}`);
  }

  const savedBundle = await getBundleIds();

  const items = [
    ...[...works.values()].map((work) => ({
      dataset: { type: DOWNLOAD_TYPE.WORK, ...work },
      checked: false,
    })),
    ...[...seriesMap.values()].map((series) => ({
      dataset: { type: DOWNLOAD_TYPE.SERIES, ...series, author: "" },
      checked: false,
      bundle: savedBundle.has(series.id),
    })),
  ];

  await downloadSelectedWorks(items, {
    bundle,
    notInSeries,
    setStatus,
  });
}

// Fetch all pages of a series and report page-level progress.
async function fetchSeriesWorks(id, onPage, delayMs = DOWNLOAD_DELAY_MS) {
  const seriesUrl = `${BASE_URL}/series/${id}`;
  const works = [];
  let info = null;

  for (let page = 1; page <= MAX_SERIES_PAGES; page++) {
    const doc = await fetchDoc(`${seriesUrl}?page=${page}`);
    if (page === 1) info = getSeriesInfo(doc, seriesUrl);

    const found = [...doc.querySelectorAll(SERIES_SELECTORS.WORK_BLURB)]
      .map((item) => workInfo(item))
      .filter(Boolean);
    works.push(...found);
    onPage?.(page, works.length);

    if (!found.length || !doc.querySelector(SERIES_SELECTORS.NEXT_PAGE)) break;
    await waitForDownloadDelay(delayMs);
  }

  return { works, info };
}

// Expand selected series to unique work jobs and retain series metadata.
async function expandDownloadSelection(
  items,
  setStatus,
  delayMs = DOWNLOAD_DELAY_MS,
) {
  const jobs = new Map();
  const seriesList = [];
  const readFailures = [];
  let standalone = 0;
  let readAnySeries = false;

  for (const checkbox of items) {
    const { type, id, title, author } = checkbox.dataset;
    if (type === DOWNLOAD_TYPE.SERIES) {
      if (readAnySeries) await waitForDownloadDelay(delayMs);
      readAnySeries = true;

      setStatus(`Reading series: ${title}`);
      try {
        const { works, info } = await fetchSeriesWorks(
          id,
          (page, count) =>
            setStatus(
              `Reading series: ${title} (page ${page}, ${count} works)`,
            ),
          delayMs,
        );
        seriesList.push({
          title,
          summary: info?.summary ?? "",
          author: info?.author ?? "",
          workIds: works.map((work) => work.id),
          bundle:
            checkbox.bundle ??
            Boolean(
              checkbox.parentElement?.querySelector(".ao3-dl-series-bundle")
                ?.checked,
            ),
        });

        for (const work of works) {
          if (!jobs.has(work.id)) jobs.set(work.id, work);
        }
        checkbox.checked = false;
      } catch (error) {
        readFailures.push(`${title} (series)`);
        createNotifPopup(`Cannot download series :(: ${error}`);
        setStatus(`Failed to read series: ${title}`);
      }
    } else if (!jobs.has(id)) {
      jobs.set(id, { id, title, author });
      standalone++;
    }
  }

  return { jobs: [...jobs.values()], seriesList, standalone, readFailures };
}

// Send a generated file URL to the background download handler.
async function downloadFile(url, filename, saveAs) {
  await browser.runtime.sendMessage({
    action: DOWNLOAD_MESSAGE,
    url,
    filename,
    saveAs,
  });
}

// Generate and download one DOCX document.
async function downloadDoc(document, filename, saveAs) {
  await downloadFile(await documentToDataUrl(document), filename, saveAs);
}

// Create a consistent safe filename for a work's DOCX document.
function getWorkFilename(title, author) {
  return `${safeFilename(title)}_${safeFilename(author)}.docx`;
}

// Prefix a series work filename with its zero-padded position in the series.
function getSeriesWorkFilename(work, position, totalWorks) {
  const order = String(position).padStart(String(totalWorks).length, "0");
  return `${order}_${getWorkFilename(work.title, work.author)}`;
}

// Merge loaded works into the selected bundle DOCX and download it.
async function downloadBundle(works, series) {
  const author =
    series?.author ||
    [...new Set(works.map((w) => w.author).filter(Boolean))].join(", ");
  const arr = series
    ? [series.title, author, "series"]
    : [works[0].title, works[0].author, "bundle"];
  const filename = arr.filter(Boolean).map(safeFilename).join("_") + ".docx";

  await downloadDoc(mergeWorks(works, series), filename, !series);
}

// Package a series' separate DOCX files into a named ZIP download.
async function downloadSeriesZip(series, works) {
  const entries = works.map(({ work, position }) => ({
    path: getSeriesWorkFilename(work, position, series.workIds.length),
    document: workToDocument(work),
  }));
  const url = await documentsToZipDataUrl(entries);
  const filename =
    [series.title, series.author].filter(Boolean).map(safeFilename).join("_") +
    ".zip";
  await downloadFile(url, filename, false);
}

// Load selected jobs and retain works needed for bundles and series archives.
async function loadSelectedWorks(
  jobs,
  items,
  { bundle, seriesWorkIds, notInSeries, setStatus, delayMs },
) {
  const loadedById = new Map();
  const { retainedWorks, tally } = await processWorkJobs(jobs, {
    bundle,
    notInSeries,
    setStatus,
    statusForWork: (title, index, total) => `${index + 1}/${total}: ${title}`,
    shouldRetainWork: (id) => seriesWorkIds.has(id),
    onWorkSkipped: (title) => setStatus(`Skipping ${title} (in series)`),
    onWorkProcessed: (id) => {
      const checkbox = items.find(
        (item) =>
          item.dataset.type === DOWNLOAD_TYPE.WORK && item.dataset.id === id,
      );
      if (checkbox) checkbox.checked = false;
    },
    errorMessage: (title, error) => `Could not download "${title}": ${error}`,
    delayMs,
  });

  for (const work of retainedWorks) loadedById.set(work.id, work);
  return { loadedById, tally };
}

// Download each selected series as a bundle docx or a ZIP of separate files.
async function downloadSeriesZips(seriesList, loadedById, setStatus, tally) {
  for (const series of seriesList) {
    const works = series.workIds
      .map((id, index) => ({
        work: loadedById.get(id),
        position: index + 1,
      }))
      .filter(({ work }) => work);
    if (!works.length) {
      if (!tally.skipped)
        recordFailure(tally, `${series.title} (series: no works loaded)`);
      continue;
    }

    setStatus(`Building ${series.bundle ? "bundle" : "ZIP"}: ${series.title}`);
    try {
      if (series.bundle && works.length > 1) {
        await downloadBundle(
          works.map(({ work }) => work),
          series,
        );
      } else {
        await downloadSeriesZip(series, works);
      }
      tally.downloaded += works.length;
    } catch (error) {
      recordFailure(tally, `${series.title} (series)`, works.length);
      createNotifPopup(`Cannot build series "${series.title}": ${error}`);
    }
  }
}

// Report the final counts, plus the name of everything that failed.
const MAX_LISTED_FAILURES = 5;

function setDownloadSummary(
  { downloaded, skipped, failed, failedItems },
  setStatus,
) {
  let text =
    `Done: ${downloaded} downloaded` +
    (skipped ? `, ${skipped} skipped` : "") +
    (failed ? `, ${failed} failed` : "");

  if (failedItems.length) {
    const shown = failedItems.slice(0, MAX_LISTED_FAILURES);
    const more = failedItems.length - shown.length;
    text += `. Failed: ${shown.join("; ")}`;
    if (more > 0) text += `; and ${more} more (see console)`;
    console.warn("AO3 download failures:", failedItems);
  }
  setStatus(text);
}

// Download selected works individually, as series ZIPs, or as one merged bundle.
export async function downloadSelectedWorks(
  items,
  {
    bundle: bundleRequested,
    notInSeries,
    setStatus,
    delayMs = DOWNLOAD_DELAY_MS,
  },
) {
  const { jobs, seriesList, standalone, readFailures } =
    await expandDownloadSelection(items, setStatus, delayMs);

  if (!jobs.length) {
    if (readFailures.length) {
      const tally = createTally();
      readFailures.forEach((name) => recordFailure(tally, name));
      setDownloadSummary(tally, setStatus);
    }
    return;
  }

  const bundle = bundleRequested && standalone > 1;
  const seriesWorkIds = new Set(seriesList.flatMap((series) => series.workIds));
  const { loadedById, tally } = await loadSelectedWorks(jobs, items, {
    bundle,
    seriesWorkIds,
    notInSeries,
    setStatus,
    delayMs,
  });

  readFailures.forEach((name) => recordFailure(tally, name));

  if (bundle) {
    const works = [...loadedById]
      .filter(([id]) => !seriesWorkIds.has(id))
      .map(([, work]) => work);
    if (works.length > 1) {
      await downloadWorksBundle(works, {
        label: "selected works",
        setStatus,
        tally,
        errorMessage: (error) => `Could not bundle selected works: ${error}`,
      });
    }
  }

  await downloadSeriesZips(seriesList, loadedById, setStatus, tally);
  setDownloadSummary(tally, setStatus);
}
