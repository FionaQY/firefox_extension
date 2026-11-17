/* globals browser */
const BUNDLE_KEY = "bundleSeriesIds";
let bundleWriteQueue = Promise.resolve();

/** Load the set of series IDs the user marked to be bundled. */
export async function getBundleIds() {
  const { [BUNDLE_KEY]: ids, settings = {} } = await browser.storage.local.get([
    BUNDLE_KEY,
    "settings",
  ]);
  if (Array.isArray(ids)) return new Set(ids);

  const legacyIds = settings[BUNDLE_KEY];
  if (!Array.isArray(legacyIds)) return new Set();

  await browser.storage.local.set({ [BUNDLE_KEY]: legacyIds });
  return new Set(legacyIds);
}

/** Save or clear one series choice without racing other checkbox changes. */
export function setBundleId(id, on) {
  const update = async () => {
    const ids = await getBundleIds();
    if (on) ids.add(id);
    else ids.delete(id);
    await browser.storage.local.set({ [BUNDLE_KEY]: [...ids] });
  };

  bundleWriteQueue = bundleWriteQueue.catch(() => {}).then(update);
  return bundleWriteQueue;
}
