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
import { sameText, stripLabel, toInteger } from "../utils/text";
import { getDocxFormat } from "./document_format";
import { loadSettings } from "../storage/settings";
import { HR_MARK } from "../ao3/work";

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
  "****",
  "*****",
  "******",
  "*******",
]);

// Inline formatting markers written by the extractor: ⟦i⟧ ... ⟦/i⟧ etc.
const FORMAT_TOKEN = /\u27E6(\/?)([ibus])\u27E7/g;
const stripMarks = (s) => String(s).replace(FORMAT_TOKEN, "");

// Split text into lines, closing and reopening any formatting that spans a
// line break so each line has balanced markers.
function splitStoryParagraphs(value) {
  const open = [];
  const out = [];

  for (const raw of String(value || "").split(/\n+/)) {
    let line = open.map((k) => `\u27E6${k}\u27E7`).join("") + raw;

    for (const m of raw.matchAll(FORMAT_TOKEN)) {
      if (m[1] === "/") {
        const idx = open.lastIndexOf(m[2]);
        if (idx >= 0) open.splice(idx, 1);
      } else {
        open.push(m[2]);
      }
    }

    line += [...open]
      .reverse()
      .map((k) => `\u27E6/${k}\u27E7`)
      .join("");
    line = line.trim();
    if (stripMarks(line).trim()) out.push(line);
  }
  return out;
}

// Turn marker text into TextRuns. Nested tags work via counters.
function makeRuns(text, base) {
  const depth = { i: 0, b: 0, u: 0, s: 0 };
  const runs = [];

  const push = (chunk) => {
    if (!chunk) return;
    runs.push(
      new TextRun({
        ...base,
        text: chunk,
        italics: depth.i > 0 || undefined,
        bold: base.bold || depth.b > 0 || undefined,
        strike: depth.s > 0 || undefined,
        underline: depth.u > 0 ? {} : undefined,
      }),
    );
  };

  let last = 0;
  for (const m of text.matchAll(FORMAT_TOKEN)) {
    push(text.slice(last, m.index));
    depth[m[2]] = Math.max(0, depth[m[2]] + (m[1] === "/" ? -1 : 1));
    last = m.index + m[0].length;
  }
  push(text.slice(last));
  return runs;
}

// Normalize story paragraph spacing and scene-break markers.
function normalizeStoryParagraph(value) {
  const source = String(value)
    .replace(/\u00a0/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/ +((?:\u27E6[ibus]\u27E7)+) +/g, " $1")
    .replace(/ +((?:\u27E6\/[ibus]\u27E7)+) +/g, "$1 ")
    .trim();
  if (SCENE_BREAKS.has(stripMarks(source).trim())) return "***";
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
    children: makeRuns(text, {
      font: { name: font },
      size: Math.round(size * 2),
      bold,
      color: "000000",
    }),
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

// Centered scene-break paragraph (AO3 <hr> and text separators like "~~~").
function makeSceneBreak(font, sizes) {
  return makeTextParagraph("***", font, sizes.body, {
    alignment: AlignmentType.CENTER,
    before: 120,
    after: 120,
    line: sizes.body * BODY_LINE_HEIGHT * 20,
    keepLines: true,
  });
}

function makeStoryParagraph(rawText, fonts, sizes) {
  const text = normalizeStoryParagraph(rawText);
  if (!stripMarks(text).trim()) return [];
  return [
    text === "***"
      ? makeSceneBreak(fonts.body, sizes)
      : makeBodyParagraph(text, fonts.body, sizes),
  ];
}

// Turn one story line into text paragraphs, scene breaks and image paragraphs.
function makeStoryParagraphs(rawText, fonts, sizes, images) {
  if (rawText === HR_MARK) return makeStoryParagraph("***", fonts, sizes);
  if (!IMG_RE.test(rawText)) return makeStoryParagraph(rawText, fonts, sizes);

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
      out.push(...makeStoryParagraph(part, fonts, sizes));
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
      .flatMap(splitStoryParagraphs)
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
    // makeNoteParagraph(
    //   "A collection of Notes and Summaries from the original published works on archiveofourown.org",
    //   fonts.body,
    //   sizes,
    //   { fontSize: sizes.body },
    // ),
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

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Patch a generated DOCX package with the required Word settings.
async function patchPackage(base64, type = "base64") {
  const zip = await JSZip.loadAsync(base64, { base64: true });

  const settingsFile = zip.file("word/settings.xml");
  if (settingsFile) {
    zip.file(
      "word/settings.xml",
      addMirrorMargins(await settingsFile.async("string")),
    );
  }

  return zip.generateAsync({
    type,
    mimeType: DOCX_MIME,
    compression: "DEFLATE",
  });
}

// Build a formatted DOCX package as "base64" or "blob".
async function buildPackage(data, type) {
  const settings = await loadSettings();
  const format = getDocxFormat(settings.general || {});
  const images = await loadImages(data);
  const base64 = await Packer.toBase64String(
    buildDocument(data, format, images),
  );
  return patchPackage(base64, type);
}

export const documentToBlob = (data) => buildPackage(data, "blob");

// Build a DOCX document and return its downloadable data URL.
export async function documentToDataUrl(data) {
  return `data:${DOCX_MIME};base64,${await buildPackage(data, "base64")}`;
}

// Package multiple generated DOCX documents into a ZIP Blob.
export async function documentsToZipBlob(entries) {
  const zip = new JSZip();
  for (const { path, document } of entries) {
    zip.file(path, await documentToBlob(document));
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

// Package multiple generated DOCX documents into a downloadable ZIP data URL.
export async function documentsToZipDataUrl(entries) {
  const zip = new JSZip();
  for (const { path, document } of entries) {
    zip.file(path, await buildPackage(document, "base64"), { base64: true });
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
