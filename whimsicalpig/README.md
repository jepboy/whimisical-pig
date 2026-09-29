# The Whimsical Pig — site rebuild

Rebuild of https://www.thewhimsicalpig.com. Kept separate from the DeFlock
Lewis County site at the repo root.

## Layout

- `original/` — a downloaded copy of the current site, kept for reference (content, images, copy)
- `index.html` (and other pages) — the new site, added here as it gets built

## Downloading the current site into `original/`

Pick one option:

**Option 1: wget (Mac/Linux, or Windows via WSL)**

```sh
cd whimsicalpig/original
wget --mirror --convert-links --adjust-extension --page-requisites --no-parent \
     -e robots=off https://www.thewhimsicalpig.com/
```

This saves every page, image, and stylesheet under `www.thewhimsicalpig.com/`.

**Option 2: HTTrack (Windows/Mac app)**

Install HTTrack from https://www.httrack.com, start a new project, enter
`https://www.thewhimsicalpig.com/`, and choose `whimsicalpig/original` as the save folder.

**Option 3: from the browser, one page at a time**

Open each page, press Ctrl+S (Cmd+S on Mac), and choose "Webpage, Complete".
Save the files into `original/`.

Then commit and push the downloaded files so they can be used for the rebuild.
