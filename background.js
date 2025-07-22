let activeTabId = null;

async function binarySearchAO3(tagUrl, workUrl) {
  // 1. Determine page range (AO3-specific)
  const maxPage = await estimateMaxPages(tagUrl);
  let low = 1, high = maxPage;

  // 2. Binary search
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const testUrl = `${tagUrl}?page=${mid}`;
    
    const found = await checkPageForWork(testUrl, workUrl);
    if (found) return testUrl;
    
    // AO3 pagination is chronological, adjust search accordingly
    await determineSearchDirection() ? (low = mid + 1) : (high = mid - 1);
  }
  return null;
}

async function checkPageForWork(pageUrl, targetWorkUrl) {
  const tab = await browser.tabs.create({ url: pageUrl, active: false });
  
  return new Promise((resolve) => {
    browser.runtime.onMessage.addListener(function listener(msg) {
      if (msg.type === "workCheckResult" && msg.tabId === tab.id) {
        browser.tabs.remove(tab.id);
        resolve(msg.containsWork);
      }
    });

    browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["/content_scripts/find_work.js"],
      args: [targetWorkUrl]
    });
  });
}

// Message handler
browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === "initiateBlocking") {
    activeTabId = sender.tab.id;
    binarySearchAO3(msg.tagUrl, msg.currentUrl)
      .then(result => browser.tabs.sendMessage(activeTabId, {
        type: "blockingResult",
        result
      }));
  }
});