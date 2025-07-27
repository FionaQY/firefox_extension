(() => {
  console.log('AO3 Save Script injected successfully!');

  async function openTagPopup() {
    const popup = document.createElement('div');
    popup.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2F4F4F;
      color: white;
      border: 2px solid red;
      padding: 1em;
      max-width: 400px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 9999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      font-family: sans-serif;
      scrollbar-width: thin;
      scrollbar-color: #999 #eee;
    `;

    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
      display: flex;
      gap: 0.5em;
      align-items: flex-start;
      margin-top: 1em;
    `;

    const inputLabel = document.createElement('label');
    inputLabel.textContent = "Note:";
    inputLabel.style.cssText = `
      white-space: nowrap;
      margin-top: 0.2em;
    `;

    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.style.cssText = `
      flex: 1;
      padding: 4px;
      font-family: inherit;
    `;

    await browser.storage.local.get('ao3Note').then(res => {
      inputField.value = res.ao3Note || '';
    });    

    inputField.addEventListener('change', () => {
      browser.storage.local.set({ao3Note: inputField.value});
    });

    inputContainer.appendChild(inputLabel);
    inputContainer.appendChild(inputField);
    popup.appendChild(inputContainer);
    document.addEventListener('click', (e) => {
      if (!popup.contains(e.target)) {
        popup.remove();
      }
    });

    document.body.appendChild(popup);
  }

  openTagPopup();
  
})();
