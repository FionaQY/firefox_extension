/* globals browser */
import { openModePopup, removeModePopup } from "./ui/popup";
import { MOBILE_MAX_WIDTH } from "./ui/popup_fields";
import { buildLinksView } from "./download/download_links";
import { buildQueueView } from "./download/download_queue";
import { buildFoldersView } from "./download/download_folders";
import { buildFormatView } from "./download/download_format";
import { DOWNLOADS_TAB, DOWNLOADS_TAB_KEY } from "./download/download_tabs";
import { el, button } from "./download/download_dom";

const TABS = [
  { id: DOWNLOADS_TAB.LINKS, label: "Links", build: buildLinksView },
  { id: DOWNLOADS_TAB.QUEUE, label: "Queue", build: buildQueueView },
  { id: DOWNLOADS_TAB.FOLDERS, label: "Folders", build: buildFoldersView },
  { id: DOWNLOADS_TAB.FORMAT, label: "Format", build: buildFormatView },
];

(async () => {
  removeModePopup();

  const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;

  const { [DOWNLOADS_TAB_KEY]: requested } =
    await browser.storage.local.get(DOWNLOADS_TAB_KEY);
  if (requested) await browser.storage.local.remove(DOWNLOADS_TAB_KEY);

  const content = el("div", "ao3-downloads-content");
  const tabBar = el("div", "ao3-tab-bar");
  tabBar.setAttribute("role", "tablist");
  const body = el("div", "ao3-tab-body");
  body.setAttribute("role", "tabpanel");
  content.append(tabBar, body);

  const tabButtons = new Map();
  let current = null;

  function show(id) {
    current?.dispose?.();
    const tab = TABS.find((t) => t.id === id) ?? TABS[0];
    for (const [tabId, btn] of tabButtons) {
      const isActive = tabId === tab.id;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    }
    current = tab.build({ isMobile, switchTab: show });
    body.replaceChildren(current.element);
  }

  for (const tab of TABS) {
    const btn = button(tab.label, () => show(tab.id), "ao3-tab");
    btn.setAttribute("role", "tab");
    tabButtons.set(tab.id, btn);
    tabBar.append(btn);
  }

  show(requested || "links");

  openModePopup(isMobile, {
    content,
    extraClasses: isMobile ? ["downloads"] : ["downloads", "flush-bottom"],
  });
})();
