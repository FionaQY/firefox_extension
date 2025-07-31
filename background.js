const modeToScriptMap = {
  block: "/content_scripts/block_mode.js",
  forgot: "/content_scripts/forgot_mode.js",
  save: "/content_scripts/save_mode.js",
  apply: "/content_scripts/apply_mode.js",
};

let pendingInjection = null;

browser.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    const [tab] = await browser.tabs.query({ 
        active: true, 
        currentWindow: true 
    });

    if (msg.action === 'executeMode') {
        // await browser.scripting.executeScript({
        //     target: { tabId: tab.id },
        //     files: ["/content_scripts/global.js", modeToScriptMap[msg.mode]]
        // });
        browser.tabs.executeScript(tab.id, {
            file: "/content_scripts/global.js"
            }, () => {
            // Execute second script after first completes
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
        browser.tabs.executeScript(tab.id, {
            file: "/content_scripts/global.js"
            }, () => {
            browser.tabs.executeScript(tab.id, {
                file: "/content_scripts/apply_mode.js"
            });
            });
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
    if (pendingInjection &&
        pendingInjection.tabId == tabId &&
        changeInfo.status === 'complete'
    ) {
        try {
            browser.tabs.executeScript(tab.id, {
                file: "/content_scripts/global.js"
            }, () => {
                browser.tabs.executeScript(tab.id, {
                file: "/content_scripts/scroll.js"
                });
            });
        } catch (error) {
            console.error('Error injecting script:', error);
        }
    }
})