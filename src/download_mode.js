/* globals browser */
import { workToLines, linesToDataUrl } from "./download_file.js";
import { safeFilename } from "./helper/commons.js";

(async () => {
  const { title, author, lines } = workToLines(document, window.location.href);
  const url = await linesToDataUrl(lines);
  browser.runtime.sendMessage({
    action: "downloadDoc",
    url,
    filename: `${safeFilename(title)}_${safeFilename(author)}.docx`,
  });
})();
