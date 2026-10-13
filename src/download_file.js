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
const SELECTOR =
  "#workskin h3.title, #workskin .chapter h3, #workskin p, #work_endnotes h3";

const toNum = (s) => parseInt((s || "").replace(/[^\d]/g, ""), 10) || 0;
const textOf = (el) => (el.innerText ?? el.textContent ?? "").trim();

export const safe = (s) => s.replace(/[\\/:*?"<>|]/g, "_").trim();

export function workToLines(doc, href) {
  const data = getTags(doc, href, false);
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

  const flat = [];
  const intro = []; // work-level Summary / Notes, labelled
  const chapters = []; // [{ heading, oneShot, lines }]
  let cur = null;
  let introSection = null;

  for (const el of doc.querySelectorAll(SELECTOR)) {
    const text = textOf(el);
    if (!text) continue;
    flat.push(text);

    if (el.matches("h3.title")) {
      cur = {
        heading: text.replace(CH_RE, "").trim(),
        oneShot: false,
        lines: [],
      };
      chapters.push(cur);
    } else if (el.closest("#chapters, div.userstuff")) {
      if (!cur) {
        cur = { heading: "", oneShot: true, lines: [] };
        chapters.push(cur);
      }
      cur.lines.push(text);
    } else if (cur) {
      cur.lines.push(text);
    } else {
      const section = el.closest(".summary")
        ? "Summary"
        : el.closest(".notes")
          ? "Notes"
          : null;
      if (section && section !== introSection) {
        intro.push(`${section}:`);
        introSection = section;
      }
      intro.push(text);
    }
  }

  if (!chapters.length) {
    chapters.push({ heading: "", oneShot: true, lines: intro.splice(0) });
  }

  const lines = [
    `URL: ${href}`,
    `Title: ${title}`,
    `Author: ${author}`,
    ...metaLines,
    ...statLines,
    data.summary ? `${data.summary}` : null,
    DIVIDER,
    ...flat,
  ].filter(Boolean);

  return {
    title,
    author,
    lines,
    url: href,
    tags: data.tags,
    summary: data.summary,
    stats,
    intro,
    chapters,
  };
}

export async function linesToDataUrl(lines) {
  const doc = new Document({
    sections: [
      {
        children: lines
          .flatMap((l) => String(l).split(/\n+/))
          .filter((l) => l.trim() !== "")
          .map((l) => new Paragraph({ children: [new TextRun(l)] })),
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export function mergeWorks(works) {
  const tagLines = TAG_MAP.map(([label, key]) => {
    const all = [...new Set(works.flatMap((w) => w.tags?.[key] || []))];
    return all.length ? `${label}: ${all.join(", ")}` : null;
  });

  const published = works
    .map((w) => w.stats.Published)
    .filter(Boolean)
    .sort()[0];
  const updated = works
    .map((w) => w.stats.Updated || w.stats.Published)
    .filter(Boolean)
    .sort()
    .at(-1);

  const flatten = (s) =>
    (s || "")
      .replace(/^Summary:\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();

  const summaryText = works
    .filter((w) => w.summary)
    .map((w) => `${w.title}: ${flatten(w.summary)}`)
    .join(" | ");

  const body = [];
  let n = 0;

  for (const w of works) {
    w.chapters.forEach((c, idx) => {
      let chapterTitle = c.heading;
      if (idx === 0) {
        chapterTitle = c.heading ? `${w.title}: ${c.heading}` : w.title;
      }
      body.push(`Chapter ${++n}${chapterTitle ? `: ${chapterTitle}` : ""}`);

      if (idx === 0) body.push(...w.intro);

      if (c.oneShot) body.push("Chapter Text");

      body.push(...c.lines);
    });
  }

  const statLines = [
    published && `Published: ${published}`,
    updated && `Updated: ${updated}`,
    ...SUM_STATS.map(
      (k) =>
        `${k}: ${works.reduce((s, w) => s + toNum(w.stats[k]), 0).toLocaleString("en-US")}`,
    ),
    `Chapters: ${n}`,
  ].filter(Boolean);

  return [
    `URL: ${works.map((w) => w.url).join(", ")}`,
    `Title: AO3 Bundle (${works.length} works)`,
    `Author: ${[...new Set(works.map((w) => w.author))].join(", ")}`,
    ...tagLines,
    ...statLines,
    summaryText ? `Summary: ${summaryText}` : null,
    DIVIDER,
    ...body,
  ].filter(Boolean);
}
