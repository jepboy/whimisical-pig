# The Whimsical Pig — site rebuild

Rebuild of https://www.thewhimsicalpig.com. Kept separate from the DeFlock
Lewis County site at the repo root. Plain HTML/CSS/JS, no build step:
open `index.html` in a browser to preview.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Home: featured banners in a frame, specialties, the full gallery of work, how ordering works, and visit info |
| `shop.html` | Online shop for ready-made items, plus **Quick Pay** for invoices, deposits and balances |
| `order.html` | **Start an Order**: a step-by-step form with example pieces, questions per order type, and photo uploads |
| `site.css`, `site.js` | Shared look, header, footer and product list for every page |
| `shop-items.js` | **Edit this** to change shop items, prices and checkout links |
| `order-config.js` | **Edit this** to change order types, examples and questions, and where orders are sent |

## Setting up the shop (payments)

The site has no server, so payments go through a hosted checkout page from
**Square** or **Stripe**. Customers click "Buy now", pay on Square's or Stripe's
secure page, and the shop gets the order and the money there. If the shop already
uses Square at the register, Square keeps everything in one place.

1. **Create a payment link for each item.**
   - Square: Dashboard → Online → Checkout links (or Payment links) → Create link.
   - Stripe: Dashboard → Payment Links → New.
   Turn on shipping-address collection for anything that ships.
2. **Paste each link into `shop-items.js`** as that item's `buyUrl`, and fill in `price`.
   Items without a link show a "Call to order" button instead, so the page works before setup is finished.
3. **Quick Pay:** create one link where the customer types the amount (Stripe:
   "Let customers choose what to pay"; Square has a similar option) and paste it into `quickPay.buyUrl`.
4. **Photos:** put item photos in `images/shop/` and set each item's `image`
   (e.g. `"images/shop/snowshoes.jpg"`). Without one, the photo from the current website is used.

To add an item, copy one `{ ... },` block in `shop-items.js` and change it.
Set `soldOut: true` to mark an item as sold out.

The shop items listed now are a starting point taken from the current site's
product list. **Prices and checkout links are blank on purpose**; fill in the real ones.

## Setting up "Start an Order"

Customers pick what they want, choose a starting example, answer that order type's
questions, add photos and contact info, review, and send. You get one tidy message
with everything, plus an order reference like `WP-261015-K3QZ`.

**Where orders go:**

- **Recommended: Formspree** (https://formspree.io): create a form, copy its URL
  (`https://formspree.io/f/xxxxxxx`), and paste it as `endpoint` in `order-config.js`.
  Orders then arrive in the shop's email inbox with the photos attached.
  Check that the plan you pick includes file uploads.
- **Until then** (`endpoint: ""`): pressing "Send my order" opens the customer's
  email app addressed to `WhimsicalPig@hotmail.com` with every answer filled in,
  and asks them to attach their photos.

**Changing questions:** each order type in `order-config.js` has a `questions` list.
Question types are `text`, `textarea`, `number`, `date`, `select`, `radio` (pick one)
and `checks` (pick several). Add `required: true` to make one mandatory.
The questions and options there are a sensible starting point; adjust them to
how the shop actually works (for example, your real background and frame choices).

**Example photos:** each order type shows examples of the most common versions.
Save a photo for each in `images/examples/`, named after its `id`:

| Order type | Example photo files |
| --- | --- |
| Military Shadow Box | `classic-retirement.jpg`, `full-career.jpg`, `medals-ribbons.jpg` |
| Flag Case | `burial-flag-case.jpg`, `flag-3x5-case.jpg`, `flag-and-certificate.jpg` |
| Guidon | `regulation-guidon.jpg`, `non-regulation-guidon.jpg` |
| Embroidery & Apparel | `unit-shirts.jpg`, `embroidered-polos-hats.jpg`, `custom-printing.jpg` |
| Custom Framing | `art-print.jpg`, `jersey.jpg`, `diploma-certificate.jpg` |
| Plaque or Award | `racing-plaque.jpg`, `appreciation-plaque.jpg`, `first-responder.jpg` |

The order-type cards themselves use `images/examples/<type id>.jpg`
(`shadow-box.jpg`, `flag-case.jpg`, `guidon.jpg`, `apparel.jpg`, `framing.jpg`, `award.jpg`, `other.jpg`).
Until those exist, photos from the current website are used where one fits.

## Photos on the home page

Until photos are copied into this folder, pictures load straight from
thewhimsicalpig.com. To host one here instead, save it in `images/` with the name
below and it takes priority:

- Slideshow: `slide-military-framing.jpg`, `slide-custom-apparel.jpg`, `slide-graphic-design.jpg`
- Collage: the product name in lowercase with dashes, `&` written as `and`, and `.jpg`, for example
  `flag-and-shadow-boxes.jpg`, `10th-mountain-snowshoes.jpg`, `firemen-emt-and-leo-items.jpg`

`images/logo.png` is a redrawn copy of the logo (made from `logo.svg`); replace it
with the original file for an exact match.

## Downloading the current site into `original/`

Pick one option:

**Option 1: wget (Mac/Linux, or Windows via WSL)**

```sh
cd whimsicalpig/original
wget --mirror --convert-links --adjust-extension --page-requisites --no-parent \
     -e robots=off https://www.thewhimsicalpig.com/
```

**Option 2: HTTrack (Windows/Mac app)**

Install HTTrack from https://www.httrack.com, start a new project, enter
`https://www.thewhimsicalpig.com/`, and choose `whimsicalpig/original` as the save folder.

**Option 3: from the browser, one page at a time**

Open each page, press Ctrl+S (Cmd+S on Mac), and choose "Webpage, Complete".
Save the files into `original/`.
