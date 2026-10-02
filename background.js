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
    settings: "settings_mode"
};

browser.browserAction.onClicked.addListener((tab) => {
    browser.tabs.sendMessage(tab.id, {action: 'showPopup'})
});

async function injectScript(tabId, scriptName) {
  try {
    await browser.tabs.executeScript(tabId, { file: "/content_scripts/global.js" });
    await browser.tabs.executeScript(tabId, { file: `/content_scripts/${scriptName}.js` });
  } catch (error) {
    console.error(`Error injecting ${scriptName} script:`, error);
  }
}

browser.runtime.onMessage.addListener(async (msg, sender) => {
    const [tab] = await browser.tabs.query({ 
        active: true, 
        currentWindow: true 
    });

    if (msg.action === 'executeMode') {
        injectScript(tab.id,  MODE_MAP[msg.mode]);
    } else if (msg.action === 'scrollPage') {
        pendingInjection = {
            data: msg.data,
            tabId: tab.id
        };
    } else if (msg.action == 'applyFilters') {
        injectScript(tab.id, 'apply_mode');
        
    } else if (msg.action == 'scrollContentScriptReady') {
        if (pendingInjection && sender.tab.id === pendingInjection.tabId) {
            browser.tabs.sendMessage(sender.tab.id, {
                action: 'initialize',
                data: pendingInjection.data
            });
        }
        pendingInjection = null;
    } else if (msg.action == 'shrinkContentScriptReady') {
        browser.tabs.sendMessage(sender.tab.id, { action: 'initialize'});
    } else if (msg.action === "downloadDoc") {
        const blob = await (await fetch(msg.url)).blob();
        const blobUrl = URL.createObjectURL(blob);

        const id = await browser.downloads.download({
            url: blobUrl,
            filename: msg.filename,
            saveAs: true
        });

        const onChanged = (delta) => {
            if (delta.id === id && delta.state &&
                (delta.state.current === "complete" || delta.state.current === "interrupted")) {
                URL.revokeObjectURL(blobUrl);
                browser.downloads.onChanged.removeListener(onChanged);
            }
        };
        browser.downloads.onChanged.addListener(onChanged);
    }
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status != 'complete') {
        return;
    }

    if (pendingInjection && pendingInjection.tabId == tabId) {
        injectScript(tab.id, 'scroll').then(() => {
            browser.tabs.executeScript(tabId, {
                file: `/content_scripts/shrink_works.js`
            });
        });
    } else if (tab.url.includes("/works/")) {
        injectScript(tab.id, 'populate_bookmark');
    } else {
        injectScript(tab.id, 'shrink_works');
    } 
})