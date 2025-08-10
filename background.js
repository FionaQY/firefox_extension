let pendingInjection = null;

browser.browserAction.onClicked.addListener((tab) => {
    browser.tabs.sendMessage(tab.id, {action: 'showPopup'})
});

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
        injectScript(tab.id, `${msg.mode}_mode`);
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
        // const { settings = {} } = await browser.storage.local.get('settings');
        // if (settings[populateBookmark]) {
        //     injectScript(tab.id, 'populate_bookmark');
        // }   
    }
})