const modeToScriptMap = {
  block: "/content_scripts/block_mode.js",
  forgot: "/content_scripts/forgot_mode.js",
  save: "/content_scripts/save_mode.js"
};

document.getElementById('mode').addEventListener('change', async (e) => {
  const mode = e.target.value;
  
  try {
    await browser.runtime.sendMessage({
      action: 'executeMode',
      mode: mode
    });
    
    window.close();
    
  } catch (error) {
    console.error("Error injecting scripts:", error);
    const errorBox = document.getElementById('error-content');
    errorBox.classList.remove('hidden');
    errorBox.querySelector('p').textContent += `\n${error}`;
  }
});