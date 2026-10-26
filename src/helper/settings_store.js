/* globals browser */
export async function loadSettings() {
  const { settings } = await browser.storage.local.get("settings");
  return settings ?? {};
}
