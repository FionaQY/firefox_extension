(() => {
  
  
  // AO3-specific tag detection
  function findTagToBlock() {
    // Example: Gets the first tag in AO3's filter section
    const tag = document.querySelector('.filters a.tag, .work.meta a.tag');
    return tag ? tag.href : null;
  }

  // Send tag URL to background script
  browser.runtime.sendMessage({
    type: "initiateBlocking",
    tagUrl: findTagToBlock(),
    currentUrl: window.location.href
  }).catch(console.error);

  // Cleanup handler
  window.addEventListener('unload', () => {
    browser.runtime.sendMessage({ type: "cleanupBlocking" });
  });


})();
