const modeToScriptMap = {
  block: "/content_scripts/block_mode.js",
  forgot: "/content_scripts/forgot_mode.js",
  save: "/content_scripts/save_mode.js",
  apply: "/content_scripts/apply_mode.js",
};

browser.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    if (message.action === 'executeMode') {
        const [tab] = await browser.tabs.query({ 
            active: true, 
            currentWindow: true 
        });
        await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["/content_scripts/global.js", modeToScriptMap[mode]]
        });
    }
});

let pendingInjection = null;

browser.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    if (message.action === 'scrollPage') {
        pendingInjection = {
            data: msg.data,
            tabId: tab.id
        };
    }
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (pendingInjection &&
        pendingInjection.tabId = tabId &&
        changeInfo.status === 'complete'
    ) {
        try {
            await browser.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["/content_scripts/scroll.js"]
            });
            await browser.tabs.sendMessage(tabId, {
                action: 'initialize',
                data: pendingInjection.data
            });
        } catch (err) {
            console.error('Error injecting script:', error);
        } finally {
            pendingInjection = null;
        }
    }
})