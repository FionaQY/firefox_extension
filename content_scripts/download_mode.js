/* globals browser */
import { workToLines, linesToDataUrl, safe } from "./download_file.js";

(async () => {
  const { title, author, lines } = workToLines(document, window.location.href);
  const url = await linesToDataUrl(lines);
  browser.runtime.sendMessage({
    action: "downloadDoc",
    url,
    filename: `${safe(title)}_${safe(author)}.docx`,
  });
})();