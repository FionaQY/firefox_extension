/* globals */
import { Document, Packer, Paragraph, TextRun } from "docx";

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

export const safe = s => s.replace(/[\\/:*?"<>|]/g, "_").trim();

export function workToLines(doc, href) {
  const data = window.AO3Extractor.getTags(doc, href, false);
  const title = doc.querySelector("h2.title.heading")?.innerText?.trim() || "untitled";
  const author = doc.querySelector("h3.byline.heading")?.innerText?.trim() || "unknown";

  const metaLines = TAG_MAP.map(([label, key]) => {
    const list = data.tags[key];
    return list && list.length ? `${label}: ${list.slice(0, 3).join(", ")}` : null;
  });

  const statLines = STAT_MAP.map(([label, selector]) => {
    const val = doc.querySelector(selector)?.innerText?.trim();
    return val ? `${label}: ${val}` : null;
  });

  const workElements = Array.from(
    doc.querySelectorAll("#workskin h3.title, #workskin .chapter h3, #workskin p, #work_endnotes h3")
  )
    .map(el => el.innerText.trim())
    .filter(Boolean);

  const lines = [
    `Title: ${title}`,
    `Author: ${author}`,
    ...metaLines,
    ...statLines,
    data.summary ? `${data.summary}` : null,
    "----------------------------------------",
    ...workElements,
  ].filter(Boolean);

  return { title, author, lines };
}

export async function linesToDataUrl(lines) {
  const doc = new Document({
    sections: [{ children: lines.map(l => new Paragraph({ children: [new TextRun(l)] })) }],
  });
  const blob = await Packer.toBlob(doc);
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}