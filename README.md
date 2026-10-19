# Firefox Extension

This is a personal Firefox extension I built for myself. It may not be polished or general-purpose, but feel free to use or modify it if it's helpful.

## Features

- Easily block a tag and automatically scroll to work before current work
- `I forgor` option gets the summary of current work automatically (if u forget what your reading)
- Apply saved filters
- Hide/Shrink works with undesired features
- Download works as book-formatted DOCX files with configurable fonts, font sizes, margins, and appendix metadata

Use the **Document Format** popup mode to adjust DOCX fonts, font sizes, page margins, and whether tags and relationships appear in the appendix. Font names should be installed on the device used to open the document; the defaults match the included Word macro.
<img height="300" alt="image" src="https://github.com/user-attachments/assets/91fe17b0-c9bc-4a08-be49-58a46d26c31d" />

<img height="300" alt="image" src="https://github.com/user-attachments/assets/6e39469d-7dee-4fc0-952f-625053ac40f4" />
<img height="300" alt="image" src="https://github.com/user-attachments/assets/d65b2531-4f98-4086-b544-dd5c59ff1343" />

## Installation (Temporary)

To load the extension in Firefox temporarily for development:

1. Git clone this repo
2. Run `npm run build` to obtain `bundle.js` file
3. Open Firefox and go to `about:debugging`
4. Click "This Firefox"
5. Click "Load Temporary Add-on"
6. Select `manifest.json` file

Note: The extension will be removed when you restart Firefox.

## Installation (Permanent)

1. Run `npm run build` to obtain `bundle.js` file
2. Compress files in repo into a `zip` file
3. Upload `zip` to Firefox Add-On Developer Hub
4. Wait until it is approved
5. Download `.xpi` file. This automatically installs on Desktop.
6. Mobile installation requires firefox nightly

OR

1. Get Addon from [product page](https://addons.mozilla.org/en-US/firefox/addon/ao3-qof/)

## Folder Structure

```
firefox-extension/
├── manifest.json
├── background.js
├── content.bundle.js
├── src/
│   └── helper/
│       ├── popup.js          # Popup and other extension UI
│       ├── extractor.js      # AO3 page parsing and metadata extraction
│       ├── download.js       # DOCX content and book-layout generation
│       ├── document_format.js # Shared DOCX font defaults and settings
│       └── commons.js       # Shared text, URL, and page-loading helpers
├── content_scripts/
├── icons/
```

## Credits

Icon by [Ning Nong](https://www.flaticon.com/authors/ning-nong) from [www.flaticon.com](https://www.flaticon.com)

npm run lint
npm run build
