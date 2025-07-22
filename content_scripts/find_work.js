function checkForWork(targetWorkUrl) {
  // AO3 work URLs contain '/works/' followed by ID
  const currentWorkIds = [...document.querySelectorAll('li.work h4.heading a')]
    .map(a => a.href.split('/works/')[1]?.split('/')[0]);

  const targetId = targetWorkUrl.split('/works/')[1]?.split('/')[0];
  return currentWorkIds.includes(targetId);
}

// Report back to background script
browser.runtime.sendMessage({
  type: "workCheckResult",
  tabId: browser.devtools.inspectedWindow.tabId,
  containsWork: checkForWork(window.location.href)
});