const modeToScriptMap = {
  block: "/content_scripts/block_mode.js",
  forgot: "/content_scripts/forgot_mode.js",
  // jump: "/content_scripts/jump_mode.js"
};

document.getElementById('mode').addEventListener('change', async (e) => {
  const mode = e.target.value;
  console.log('Mode changed:', e.target.value);
  
  try {
    const [tab] = await browser.tabs.query({ 
      active: true, 
      currentWindow: true 
    });

    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: [modeToScriptMap[mode]]
    });

    window.close();
    
  } catch (error) {
    console.error("Error injecting scripts:", error);
    document.getElementById('error-content').classList.remove('hidden');
  }
});