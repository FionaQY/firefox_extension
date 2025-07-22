const modeToScriptMap = {
  block: "/content_scripts/block_mode.js",
  jump: "/content_scripts/jump_mode.js",
  other: "/content_scripts/other_mode.js",
};


document.getElementById('mode').addEventListener('change', async(e) => {
  // inject content script
  const mode = e.target.value;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })

  const scriptToInject = modeToScriptMap[mode];
  if (scriptToInject) {
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: [scriptToInject],
    });
  } 
  window.close();
});