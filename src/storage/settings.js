/* globals browser */
export async function getSettings() {
  const { settings } = await browser.storage.local.get("settings");
  return settings ?? {};
}

export async function saveSettings(settings) {
  await browser.storage.local.set({ settings });
}

export const loadSettings = getSettings;
