/* globals browser */

import {
  normLang,
  extractAllValues,
  WORK_BLURB_SELECTOR,
} from "./helper/extractor";
import { createNotifPopup, getSettings } from "./helper/popup";
import { getWorkUrl, textOf } from "./helper/commons";

const SELECTORS = {
  TAG_LINKS: "ul.tags.commas li a",
};

const splitList = (value) =>
  String(value ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const toLimit = (value) => {
  if (value === "" || value == null) return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

const wildcardToRegex = (pattern) =>
  new RegExp(
    "^" +
      pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") +
      "$",
    "i",
  );

(() => {
  browser.runtime.onMessage.addListener(async (msg) => {
    if (msg.action === "initialize") {
      if (typeof window.A03WorkShrinker === "function") {
        return;
      }
      await handleShrinkWorks();
      window.A03WorkShrinker = handleShrinkWorks;
    }
  });

  const currentUrl = window.location.href;
  const workUrl = getWorkUrl(currentUrl);
  if (workUrl != "") {
    createNotifPopup("No works to shrink here");
    return;
  }

  function isUndesired(work, workSettings) {
    const stats = extractAllValues(work);
    const reasons = new Set();

    // Word count
    const words = stats.word_count;
    const under = toLimit(workSettings.hideWordUnder);
    const over = toLimit(workSettings.hideWordOver);
    if (under !== null && words < under) reasons.add(`words < ${under}`);
    if (over !== null && words > over) reasons.add(`words > ${over}`);

    const workLang = stats.language;
    if (workLang) {
      for (const lang of splitList(workSettings.hideLanguage)) {
        if (normLang(lang) === normLang(workLang)) reasons.add(`Language: ${lang}`);
      }

      const showLanguages = splitList(workSettings.showLanguage);
      const allowed = showLanguages.map(normLang);
      if (allowed.length > 0 && !allowed.includes(workLang)) {
        reasons.add(`Language: not ${showLanguages.join(", ")}`);
      }
    }

    // Tags
    const tags = Array.from(work.querySelectorAll(SELECTORS.TAG_LINKS), textOf)
      .map((t) => t.trim())
      .filter(Boolean);
    for (const ex of splitList(workSettings.hideTags)) {
      const pattern = wildcardToRegex(ex);
      for (const tag of tags) {
        if (pattern.test(tag)) reasons.add(`Tag: ${tag}`);
      }
    }

    // Authors (exact, case-insensitive match)
    const workAuthors = stats.authors.map((a) => a.toLowerCase());
    for (const author of splitList(workSettings.hideAuthor)) {
      if (workAuthors.includes(author.toLowerCase())) {
        reasons.add(`Author: ${author}`);
      }
    }

    return [...reasons].join(", ");
  }

  function shrink(work, reason, hideEntirely) {
    if (work.dataset.ao3Shrunk) return;
    work.dataset.ao3Shrunk = "true";

    if (hideEntirely) {
      work.classList.add("ao3-hidden");
      return;
    }
    const header = document.createElement("div");
    header.classList.add("ao3-shrink-header");

    const toggle = document.createElement("button");
    toggle.textContent = "Show/Hide Work";
    toggle.classList.add("ao3-shrink-toggle");

    const label = document.createElement("span");
    label.textContent = reason;

    header.appendChild(label);
    header.appendChild(toggle);

    const content = document.createElement("div");
    while (work.firstChild) {
      content.appendChild(work.firstChild);
    }
    content.classList.add("ao3-hidden");

    work.appendChild(header);
    work.appendChild(content);

    toggle.addEventListener("click", () => {
      content.classList.toggle("ao3-hidden");
    });
  }

  async function handleShrinkWorks() {
    const settings = await getSettings();
    if (!settings["general"]["shrinkWorks"]) {
      return;
    }
    let workSettings = settings.workSettings || {};
    const works = document.querySelectorAll(WORK_BLURB_SELECTOR);
    for (const work of works) {
      const reason = isUndesired(work, workSettings);
      if (reason.length > 0) {
        shrink(work, reason, workSettings["hideEntirely"]);
      }
    }
  }

  setTimeout(() => {
    browser.runtime.sendMessage({ action: "shrinkContentScriptReady" });
  }, 100);
})();
