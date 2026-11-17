/* globals browser */
import { openModePopup, removeModePopup } from "./ui/popup";
import { MOBILE_MAX_WIDTH } from "./ui/popup_fields";
import { buildLinksView } from "./download/download_links";
import { buildQueueView } from "./download/download_queue";
import { buildFoldersView } from "./download/download_folders";
import { buildFormatView } from "./download/download_format";
import { DOWNLOADS_TAB, DOWNLOADS_TAB_KEY } from "./download/download_tabs";
import { el } from "./download/download_dom";

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
  const body = el("div", "ao3-tab-body");
  content.append(tabBar, body);

  const tabButtons = new Map();
  let current = null;

  function show(id) {
    current?.dispose?.();
    const tab = TABS.find((t) => t.id === id) ?? TABS[0];
    for (const [tabId, btn] of tabButtons) {
      btn.classList.toggle("active", tabId === tab.id);
    }
    current = tab.build({ isMobile, switchTab: show });
    body.replaceChildren(current.element);
  }

  for (const tab of TABS) {
    const btn = el("button", "ao3-control-button ao3-tab", tab.label);
    btn.type = "button";
    btn.addEventListener("click", () => show(tab.id));
    tabButtons.set(tab.id, btn);
    tabBar.append(btn);
  }

  show(requested || "links");

  openModePopup(isMobile, {
    content,
    buttons: [
      { text: "Close", variant: "neutral", onClick: () => removeModePopup() },
    ],
    extraClasses: isMobile ? ["downloads"] : ["downloads", "flush-bottom"],
  });
})();
