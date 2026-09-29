# The Whimsical Pig — site rebuild

Rebuild of https://www.thewhimsicalpig.com. Kept separate from the DeFlock
Lewis County site at the repo root.

## Layout

- `index.html` — the new site: one self-contained page, no build step. Open it in a browser to preview.
- `images/` — photos for the new site (see below)
- `original/` — the saved home page of the current site, kept for reference

## Adding photos

Every photo spot shows a striped placeholder until a matching file exists in `images/`.
Name each photo exactly like this (`.jpg`):

| File | Where it shows |
| --- | --- |
| `hero.jpg` | Faint background behind the top banner |
| `military-framing.jpg`, `custom-apparel.jpg`, `graphic-design.jpg` | The three service cards |
| `framed-military-artwork.jpg` | Framed Military Artwork |
| `flag-shadow-boxes.jpg` | Flag & Shadow Boxes |
| `battalion-spreads.jpg` | Battalion Spreads |
| `regulation-guidons.jpg` | Regulation Guidons |
| `non-regulation-guidons.jpg` | Non Regulation Guidons |
| `10th-mountain-snowshoes.jpg` | 10th Mountain Snowshoes |
| `purple-hearts-reunited.jpg` | Purple Hearts Reunited Inc. |
| `non-military-framing.jpg` | Non Military Framing |
| `vinyl-applied-custom-apparel.jpg` | Vinyl Applied Custom Apparel |
| `embroidery.jpg` | Embroidery |
| `customized-gifts.jpg` | Customized Gifts |
| `custom-designed-prints.jpg` | Custom Designed Prints |
| `custom-printing.jpg` | Custom Printing |
| `path-tracing.jpg` | Path Tracing |
| `sublimated-images-on-slate.jpg` | Sublimated Images on Slate |
| `sublimated-plates-on-wooden-plaques.jpg` | Sublimated Plates on Wooden Plaques |
| `racing-plaques-awards.jpg` | Racing Plaques, Awards, Etc. |
| `firemen-emt-leo-items.jpg` | Firemen, EMT, & LEO Items |
| `masonic-items.jpg` | Masonic Items |
| `evident-truths-products.jpg` | Evident Truths Products |

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
