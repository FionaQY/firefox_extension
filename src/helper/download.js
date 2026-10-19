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
} from "docx";
import JSZip from "jszip";
import { sameText, stripLabel, toInteger } from "./commons.js";
import { getSettings } from "./popup.js";
import { getDocxFormat } from "./document_format.js";
import { extractWorkData } from "./extractor.js";

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

function formatChapterHeader(number, heading) {
  return heading || `Chapter ${number}`;
}

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

function getWorkMetadataNotes(work) {
  const notes = work.url ? [`URL: ${work.url}`] : [];
  const tags = Object.entries(work.tags || {}).filter(
    ([category, values]) => category !== "relationship" && values?.length,
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

  const relationships = work.tags?.relationship || [];
  if (relationships.length) {
    notes.push(`Relationships: ${relationships.join(", ")}`);
  }

  return notes;
}

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

function getYear(value) {
  return String(value || "").match(/\b\d{4}\b/)?.[0] || "";
}

function isSingleChapter(value) {
  const chapters = String(value || "").trim();
  return !chapters || chapters === "1" || chapters === "1/1";
}

function isCompleteMultiChapterWork(value) {
  const [current, total] = String(value || "")
    .split("/")
    .map((part) => Number(part.trim()));
  return total > 1 && current === total;
}

function getMacroCompletedYear(stats) {
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

function getInfoSummary(summaryText) {
  const summary = String(summaryText || "").trim();
  return /^Series:/i.test(summary) ? "" : summary;
}

//  three blank lines, the details, with the same blank-line spacing.
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

function normalizeStoryParagraph(value) {
  const source = String(value)
    .replace(/\u00a0/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
  if (SCENE_BREAKS.has(source)) return "***";
  return source.replace(/--/g, "—");
}

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

function makeStyles(fonts, sizes) {
  const run = (points, extra = {}) => ({
    font: fonts.headings,
    size: Math.round(points * 2),
    bold: false,
    italics: false,
    color: "000000",
    ...extra,
  });

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

  // docx ships its own blue Heading 1-6 styles; overriding them through
  // `default.headingN` replaces them (adding paragraphStyles with the same
  // ids would create duplicates, and Word would use the blue built-ins).
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
function makeHeading(text, level, runOptions = {}) {
  return new Paragraph({
    heading: HEADING_LEVELS[level],
    children: [new TextRun({ text, ...runOptions })],
  });
}

function makeInfoParagraph(text) {
  return new Paragraph({
    style: "Subtitle",
    children: [new TextRun({ text })],
  });
}

/* ------------------------------------------------------------------ */
/* Body paragraphs and footers                                         */
/* ------------------------------------------------------------------ */

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

function makeBodyParagraph(text, font, sizes) {
  return makeTextParagraph(text, font, sizes.body, {
    alignment: AlignmentType.JUSTIFIED,
    firstLine: 288,
    line: sizes.body * BODY_LINE_HEIGHT * 20,
    widowControl: true,
  });
}

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
function makePageFooters(font) {
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
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function makeChapterSection(chapter, fonts, sizes, page, footers) {
  const children = [
    makeHeading(chapter.heading, 1),
    ...chapter.paragraphs
      .flatMap(splitParagraphs)
      .map(normalizeStoryParagraph)
      .filter(Boolean)
      .map((text) => makeBodyParagraph(text, fonts.body, sizes)),
  ];

  return {
    properties: { type: SectionType.NEXT_PAGE, page, titlePage: true },
    footers,
    children,
  };
}

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

function buildDocument(data, format) {
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
    makeBlankSection(page),
    makeBlankSection(page),
    ...data.chapters.map((chapter) =>
      makeChapterSection(
        chapter,
        fonts,
        sizes,
        page,
        makePageFooters(fonts.body),
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

export async function documentToDataUrl(data) {
  const settings = await getSettings();
  const format = getDocxFormat(settings.general || {});
  const base64 = await Packer.toBase64String(buildDocument(data, format));
  const patched = await patchPackage(base64);

  return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${patched}`;
}

/* ------------------------------------------------------------------ */
/* Data assembly                                                       */
/* ------------------------------------------------------------------ */

function combineTags(tagSets) {
  return Object.fromEntries(
    TAG_KEYS.map((key) => [
      key,
      [...new Set(tagSets.flatMap((tags) => tags?.[key] || []))],
    ]),
  );
}

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

export function workToDocument(doc, href) {
  const data = extractWorkData(doc, href);
  const { chapters, appendix } = buildBodyAndAppendix([data], {
    headerFor: (_work, chapter, idx) =>
      formatChapterHeader(idx + 1, chapter.heading),
    includeWorkSummary: false,
  });
  const summary = getInfoSummary(data.summaryText);
  const formattedAppendixNotes = [
    ...(summary ? [`Summary: ${summary}`] : []),
    ...getWorkMetadataNotes(data),
  ];
  const formattedAppendix = formattedAppendixNotes.length
    ? [{ notes: formattedAppendixNotes }, ...appendix]
    : appendix;

  return {
    ...data,
    document: createDocumentData({
      url: href,
      title: data.title,
      author: data.author,
      tags: data.tags,
      stats: data.stats,
      summaryText: data.summaryText,
      seriesTitle: data.tags?.series?.join(", "),
      completedYear: getMacroCompletedYear(data.stats),
      chapters,
      appendix: formattedAppendix,
    }),
  };
}

function completedYear(works) {
  const completeWorks = works.filter((work) =>
    isCompleteMultiChapterWork(work.stats.Chapters),
  );
  if (!completeWorks.length || completeWorks.length !== works.length) return "";

  const years = completeWorks.map((work) => getYear(work.stats.Updated));
  return years.every(Boolean) && new Set(years).size === 1 ? years[0] : "";
}

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
    title: series?.title || `AO3 Bundle (${works.length} works)`,
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
