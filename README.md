# Firefox Extension
This is a personal Firefox extension I built for myself. It may not be polished or general-purpose, but feel free to use or modify it if it's helpful.

## Features
- Easily block a tag and automatically scroll to work before current work
- `I forgor` option gets the summary of current work automatically (if u forget what your reading)
- Apply saved filters
- Hide/Shrink works with undesired features
<img height="300" alt="image" src="https://github.com/user-attachments/assets/91fe17b0-c9bc-4a08-be49-58a46d26c31d" />
<img height="300" alt="image" src="https://github.com/user-attachments/assets/6e39469d-7dee-4fc0-952f-625053ac40f4" />
<img height="300" alt="image" src="https://github.com/user-attachments/assets/d65b2531-4f98-4086-b544-dd5c59ff1343" />


## Installation (Temporary)

To load the extension in Firefox temporarily for development:
1. Git clone this repo
2. Open Firefox and go to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select `manifest.json` file

Note: The extension will be removed when you restart Firefox.

## Installation (Permanent)

1. Compress files in repo into a zip file
2. Upload zip to Firefox Add-On Developer Hub
3. Wait until it is approved
4. Download `.xpi` file. This automatically installs on Desktop.
5. Mobile installation requires firefox nightly

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
