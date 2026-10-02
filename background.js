/* globals browser */
let pendingInjection = null;

const MODE_MAP = {
  block: "block_mode",
  forgot: "forgot_mode",
  apply: "apply_mode",
  save: "save_mode",
  hide: "hide_mode",
  search: "search_mode",
  download: "download_mode.bundle",
  settings: "settings_mode",
};

browser.browserAction.onClicked.addListener((tab) => {
  browser.tabs.sendMessage(tab.id, { action: "showPopup" });
});

async function injectScript(tabId, ...scripts) {
  const files = ["global", ...scripts];

  try {
    for (const name of files) {
      await browser.tabs.executeScript(tabId, { file: `/content_scripts/${name}.js` });
    }
  } catch (error) {
    console.error(`Error injecting ${scripts.join(", ")}:`, error);
  }
}

async function downloadDoc(msg) {
  const blob = await (await fetch(msg.url)).blob();
  const blobUrl = URL.createObjectURL(blob);

  const id = await browser.downloads.download({
    url: blobUrl,
    filename: msg.filename,
    saveAs: true,
  });

  const onChanged = (delta) => {
    if (
      delta.id === id &&
      delta.state &&
      (delta.state.current === "complete" || delta.state.current === "interrupted")
    ) {
      URL.revokeObjectURL(blobUrl);
      browser.downloads.onChanged.removeListener(onChanged);
    }
  };
  browser.downloads.onChanged.addListener(onChanged);
}

// action -> (msg, sender, tab)
const handlers = {
  executeMode(msg, sender, tab) {
    injectScript(tab.id, MODE_MAP[msg.mode]);
  },

  scrollPage(msg, sender, tab) {
    pendingInjection = { data: msg.data, tabId: tab.id };
  },

  applyFilters(msg, sender, tab) {
    injectScript(tab.id, "apply_mode");
  },

  scrollContentScriptReady(msg, sender) {
    if (pendingInjection && sender.tab.id === pendingInjection.tabId) {
      browser.tabs.sendMessage(sender.tab.id, {
        action: "initialize",
        data: pendingInjection.data,
      });
    }
    pendingInjection = null;
  },

  shrinkContentScriptReady(msg, sender) {
    browser.tabs.sendMessage(sender.tab.id, { action: "initialize" });
  },

  downloadDoc(msg) {
    return downloadDoc(msg);
  },
};

browser.runtime.onMessage.addListener(async (msg, sender) => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const handler = handlers[msg.action];
  if (handler) await handler(msg, sender, tab);
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status != "complete") return;

  if (pendingInjection && pendingInjection.tabId == tabId) {
    injectScript(tab.id, "scroll").then(() => {
      browser.tabs.executeScript(tabId, { file: "/content_scripts/shrink_works.js" });
    });
  } else if (tab.url.includes("/works/")) {
    injectScript(tab.id, "populate_bookmark");
  } else {
    injectScript(tab.id, "shrink_works", "download_list.bundle");
  }
});