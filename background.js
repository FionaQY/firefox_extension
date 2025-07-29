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
        await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["/content_scripts/global.js", modeToScriptMap[msg.mode]]
        });
    } else if (msg.action === 'scrollPage') {
        pendingInjection = {
            data: msg.data,
            tabId: tab.id
        };
    } else if (msg.action == 'applyFilters') {
        await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["/content_scripts/global.js", "/content_scripts/apply_mode.js"]
        });
    }
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (pendingInjection &&
        pendingInjection.tabId == tabId &&
        changeInfo.status === 'complete'
    ) {
        try {
            await browser.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["/content_scripts/global.js", "/content_scripts/scroll.js"]
            });
            await browser.tabs.sendMessage(tabId, {
                action: 'initialize',
                data: pendingInjection.data
            });
        } catch (error) {
            console.error('Error injecting script:', error);
        } finally {
            pendingInjection = null;
        }
    }
})