# Firefox Extension
This is a personal Firefox extension I built for myself. It may not be polished or general-purpose, but feel free to use or modify it if it's helpful.

## Features
- Easily block a tag and automatically scroll to work before current work
- `I forgor` option gets the summary of current work automatically (if u forget what your reading)
- Apply saved filters
- Hide/Shrink works with undesired features

## Installation (Temporary)

To load the extension in Firefox temporarily for development:
1. Git clone this repo
2. Open Firefox and go to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select `manifest.json` file

Note: The extension will be removed when you restart Firefox.

## Folder Structure
```
firefox-extension/
├── manifest.json
├── background.js
├── content.js
├── content_scripts/
├── icons/
```

## Credits
Icon by [Ning Nong](https://www.flaticon.com/authors/ning-nong) from [www.flaticon.com](https://www.flaticon.com)