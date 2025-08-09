const modeToScriptMap = {
  block: "/content_scripts/block_mode.js",
  forgot: "/content_scripts/forgot_mode.js",
  save: "/content_scripts/save_mode.js",
  apply: "/content_scripts/apply_mode.js",
};

let pendingInjection = null;

function injectScript(tabId, scriptName) {
    try {
        browser.tabs.executeScript(tabId, {
            file: "/content_scripts/global.js"
        }, () => {
            browser.tabs.executeScript(tabId, {
                file: `/content_scripts/${scriptName}.js`
            });
        });
    } catch (error) { 
        console.error(`Error injecting ${scriptName} script:`, error);
    }
}

browser.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    const [tab] = await browser.tabs.query({ 
        active: true, 
        currentWindow: true 
    });

    if (msg.action === 'executeMode') {
        browser.tabs.executeScript(tab.id, {
            file: "/content_scripts/global.js"
            }, () => {
            browser.tabs.executeScript(tab.id, {
                file: modeToScriptMap[msg.mode]
            });
            });
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
    }
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status != 'complete') {
        return;
    }

    if (pendingInjection && pendingInjection.tabId == tabId) {
        injectScript(tab.id, 'scroll');
    } else if (tab.url.includes("/works/")) {
        injectScript(tab.id, 'populate_bookmark');
    }
})