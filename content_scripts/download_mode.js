/* globals browser */
import { Document, Packer, Paragraph, TextRun } from "docx";

(async () => {
  const title =
    document.querySelector("h2.title.heading")?.innerText?.trim() || "untitled";
  const author =
    document.querySelector("h3.byline.heading")?.innerText?.trim() || "unknown";

  const lines = document.body.innerText
    .replace(/\r/g, "")
    .split("\n")
    .map(l => l.replace(/\u00a0/g, " ").trimEnd())
    .filter(l => l.trim() !== "");

  const doc = new Document({
    sections: [{
      children: lines.map(l => new Paragraph({ children: [new TextRun(l)] })),
    }],
  });

  const blob = await Packer.toBlob(doc);
  const reader = new FileReader();
  reader.onload = () => {
    const safe = s => s.replace(/[\\/:*?"<>|]/g, "_");
    browser.runtime.sendMessage({
      action: "downloadDoc",
      url: reader.result,
      filename: `${safe(title)}_${safe(author)}.docx`,
    });
  };
  reader.readAsDataURL(blob);
})();