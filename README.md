# The Whimsical Pig — site rebuild

Rebuild of https://www.thewhimsicalpig.com. Plain HTML/CSS/JS, no build step:
open `index.html` in a browser to preview.

## Hosting (Cloudflare, free)

The site runs on Cloudflare Workers at https://whimisical-pig.wwagner.workers.dev.
Every push to `main` deploys automatically (settings in `wrangler.jsonc`).

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Home: featured banners in a frame, specialties, the full gallery of work, how ordering works, and visit info |
| `shop.html` | Online shop: ready-made items with prices and stock left, Square checkout, plus **Quick Pay** |
| `admin.html` | **Shop admin** at `/admin`: add items, prices, photos and stock; see online orders |
| `src/worker.js` | The shop's back end (runs on Cloudflare): item list, checkout, Square payment notices, admin |
| `order.html` | **Start an Order**: a step-by-step form with example pieces, questions per order type, and photo uploads |
| `story.html` | **Our Story**: the shop's story with the pig painting. Written from known facts only — add your own history (who started it, how, and why a pig) |
| `help.html` | **Help & FAQ**: common questions, what to have ready for each order type, how to mail items in, and caring for a framed piece |
| `site.css`, `site.js` | Shared look, header, footer and product list for every page |
| `settings.js` | **Edit this** for the announcement bar, review and gift card links, and the FAQ answers |
| `shop-items.js` | Backup item list, shown only before any items are added at `/admin` |
| `order-config.js` | **Edit this** to change order types, examples and questions, and where orders are sent |

## Shop-wide settings (`settings.js`)

| Setting | What it does |
| --- | --- |
| `announcement` | A notice bar at the top of every page, e.g. holiday order deadlines or closures |
| `reviewsUrl` | Adds a "Leave us a review" link in the footer. Send it to customers at pickup too |
| `giftCardUrl` | Adds a Gift Cards panel to the Shop |
| `faq` | The questions and answers on the Help page |

**Please read through the FAQ answers.** They're written to be safe and general
(no promised turnaround times or deposit amounts). Once the shop decides on a
deposit policy or typical turnaround, put it in those answers so customers see it
before ordering.

## The shop and its admin page

Items, prices, photos and stock live in a small database on Cloudflare (created
automatically). Manage them at **`/admin`**. Square only handles the payment.

**How it works**

- The Shop page lists every item marked "Show in the shop", with its price and how many are left.
- **Buy Now** checks stock, holds the item for 30 minutes, and sends the customer to Square's secure checkout.
- When Square reports the payment complete, the order shows as **Paid** in the admin page and the stock goes down by itself.
- Sales rung up **in the store** don't change the website's count. Use the − button in the admin page after an in-store sale of a shop item.

**One-time setup**

1. **Admin password.** In Cloudflare: *Workers & Pages → whimisical-pig → Settings → Variables and Secrets → Add*.
   Type **Secret**, name `ADMIN_PASSWORD`, value: a strong password. Then open `/admin` and log in.
2. **Square app.** Go to https://developer.squareup.com, sign in with the shop's Square account, and create an app
   (any name, e.g. "Whimsical Pig website"). Under **Production**, copy the **Access token**, and under **Locations**
   copy the shop's **Location ID**. Add both in Cloudflare as Secrets:
   `SQUARE_ACCESS_TOKEN` and `SQUARE_LOCATION_ID`.
3. **Payment notices.** In the Square app, open **Webhooks → Subscriptions → Add subscription** (Production):
   - URL: `https://whimisical-pig.wwagner.workers.dev/api/square-webhook` (use the shop's own domain later if it moves)
   - Event: `payment.updated`

   Save, copy the subscription's **Signature key**, and add it in Cloudflare as Secret `SQUARE_WEBHOOK_SIGNATURE_KEY`.
4. **Test first (optional).** Use the Square app's **Sandbox** token, location and webhook instead, and add the secret
   `SQUARE_ENVIRONMENT` = `sandbox`. Buy something with Square's test card, check it shows as Paid, then switch the
   secrets to Production and delete `SQUARE_ENVIRONMENT`.

Until steps 2–3 are done, Buy Now shows "Online checkout isn't set up yet. Please call…".

**Quick Pay** (invoices and deposits) is still a single Square payment link where the customer types the amount:
create it in Square and paste it into `shop-items.js` as `quickPay.buyUrl`.

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

**"Have these ready" lists:** each order type has a `bring` list shown above its
questions and on the Help page. Links like `order.html?type=shadow-box` open the
form with that order type already picked, handy for emails and Facebook posts.

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

Brand images: `images/logo-full.png` (full logo with the name, used on the home page),
`images/flying-pig.png` (the flying pig mascot), and `images/painting.webp` (the pig
painting on Our Story). White backgrounds were made transparent.

`images/logo-original.png` is the original logo file. `images/logo.png` is the same
logo with the black background around it made transparent; the site uses that one.

## Downloading the current site into `original/`

Pick one option:

**Option 1: wget (Mac/Linux, or Windows via WSL)**

```sh
cd original
wget --mirror --convert-links --adjust-extension --page-requisites --no-parent \
     -e robots=off https://www.thewhimsicalpig.com/
```

**Option 2: HTTrack (Windows/Mac app)**

Install HTTrack from https://www.httrack.com, start a new project, enter
`https://www.thewhimsicalpig.com/`, and choose the `original` folder as the save location.

**Option 3: from the browser, one page at a time**

Open each page, press Ctrl+S (Cmd+S on Mac), and choose "Webpage, Complete".
Save the files into `original/`.
