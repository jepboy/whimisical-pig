# The Whimsical Pig — site rebuild

Rebuild of https://www.thewhimsicalpig.com. Plain HTML/CSS/JS, no build step:
open `index.html` in a browser to preview.

## Hosting (Cloudflare, free)

The site runs on Cloudflare Workers at https://whimisical-pig.wwagner.workers.dev.
Every push to `main` deploys automatically (settings in `wrangler.jsonc`), as long as the
`whimisical-pig` Worker is connected to this repo in Cloudflare (Worker → Settings → Build,
branch `main`, deploy command `npx wrangler deploy`). Cloudflare's drag-and-drop uploader
can't take this repo as-is because of the shop back end; use the Git connection instead.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Home: the full logo with the flying pig, featured banners, specialties, a peek at our work, and how ordering works |
| `work.html` | **Our Work**: the full gallery with Military / Framing / Apparel / Awards & Gifts filters |
| `visit.html` | **Visit**: address, hours, phone, email, map, and ways to reach us from out of town |
| `shop.html` | Online shop: items from Square with options, prices and stock left, a cart, Square checkout, plus **Quick Pay** |
| `admin.html` | **Shop admin** at `/admin`: order requests, online orders, stock counts and a setup check |
| `src/worker.js` | The shop's back end (runs on Cloudflare): item list, checkout, Square payment notices, admin |
| `order.html` | **Start an Order**: a step-by-step form with example pieces, questions per order type, and photo uploads |
| `story.html` | **Our Story**: the shop's story with the pig painting. Written from known facts only — add your own history (who started it, how, and why a pig) |
| `help.html` | **Help & FAQ**: common questions, what to have ready for each order type, how to mail items in, and caring for a framed piece |
| `site.css`, `site.js` | Shared look, header, footer and product list for every page |
| `settings.js` | **Edit this** for the announcement bar, review and gift card links, and the FAQ answers |
| `shop-items.js` | Backup item list, shown only until Square is connected |
| `order-config.js` | **Edit this** to change order types, examples and questions, and where orders are sent |

## Shop-wide settings (`settings.js`)

| Setting | What it does |
| --- | --- |
| `announcement` | A notice bar at the top of every page, e.g. holiday order deadlines or closures |
| `reviewsUrl` | Adds a "Leave us a review" link in the footer. Send it to customers at pickup too |
| `giftCardUrl` | Adds a Gift Cards panel to the Shop |
| `faq` | The questions and answers on the Help page |
| `localPhotos` | File names of extra photos you've added to `images/` for cards that still use the current website's pictures |

**Please read through the FAQ answers.** They're written to be safe and general
(no promised turnaround times or deposit amounts). Once the shop decides on a
deposit policy or typical turnaround, put it in those answers so customers see it
before ordering.

## The shop and its admin page

**Square is the one place for shop items, prices, photos and stock.** Anything in
the Square category **Website** shows in the online shop. In-store and online sales
come out of the same stock count, and Square adds sales tax at checkout.

**How it works**

- **Shop page:** lists everything in Square's Website category, with options like
  sizes, price and how many are left. Customers add items to a cart, choose pick up
  (or shipping, if a shipping fee is set), and pay on Square's secure checkout page.
- While a customer is paying, their items are held for 30 minutes so two people
  can't buy the last one.
- **Quick Pay:** customers type the amount and an invoice or order number, then pay
  through Square. No separate payment link is needed.
- When Square reports a payment, it shows in the admin page under **Online Orders**.

**The admin page** (`/admin`, password protected) has four tabs:

| Tab | What it's for |
| --- | --- |
| Order Requests | Everything from the Start an Order form, with photos. Soonest due first: red = past due, amber = due within 3 days. Status (new → quoted → waiting on items → in production → ready → done), private notes, search, reply by email or call. |
| Online Orders | Paid shop orders and Quick Pay payments: items, pick up or ship address, buyer email. Mark them ready and picked up / shipped, and add notes like tracking numbers. |
| Shop Items | What's in the Website category, live from Square. Quick stock counts with + and −. Adding items, prices and photos is done in Square. |
| Setup | A checklist of what's connected, with anything missing in red. |

**Adding things to the online shop (in Square)**

1. In Square: **Items → Categories → Create category** named **Website** (once).
2. Create or open an item, add its photo, price and options (sizes, colors…), and
   add it to the **Website** category. Turn on **stock tracking** if you want the shop
   to show how many are left and stop selling at zero.
3. It appears on the website within a minute.

**One-time setup**

1. **Admin password.** In Cloudflare: *Workers & Pages → whimisical-pig → Settings → Variables and Secrets → Add*.
   Type **Secret**, name `ADMIN_PASSWORD`, value: a strong password. Then open `/admin` and log in.
2. **Square app.** Go to https://developer.squareup.com, sign in with the shop's Square account, and create an app
   (any name, e.g. "Whimsical Pig website"). Under **Production**, copy the **Access token**, and under **Locations**
   copy the shop's **Location ID**. Add both in Cloudflare as Secrets:
   `SQUARE_ACCESS_TOKEN` and `SQUARE_LOCATION_ID`.
3. **Square notices.** In the Square app, open **Webhooks → Subscriptions → Add subscription** (Production):
   - URL: `https://whimisical-pig.wwagner.workers.dev/api/square-webhook` (use the shop's own domain later if it moves)
   - Events: `payment.created`, `payment.updated`, `inventory.count.updated`, `catalog.version.updated`

   Save, copy the subscription's **Signature key**, and add it in Cloudflare as Secret `SQUARE_WEBHOOK_SIGNATURE_KEY`.
4. **Shipping (optional).** To offer shipping, add a variable `SHIPPING_FEE` with the flat charge in dollars, e.g. `12.95`.
   Without it, online orders are pick up only.
5. **Check it.** Open `/admin` → **Setup**. Everything should be green.
6. **Test first (recommended).** Use the Square app's **Sandbox** token, location and webhook instead, and add
   `SQUARE_ENVIRONMENT` = `sandbox`. Make a test item in the sandbox's Website category with stock tracking on, buy one
   with Square's test card, and check that: it shows as **Paid** under Online Orders, and the stock went down by one.
   Then switch the secrets to Production and delete `SQUARE_ENVIRONMENT`.

Optional: `SQUARE_SHOP_CATEGORY` to use a category name other than "Website".

Until Square is connected, the shop shows the items in `shop-items.js` with "Call to Order" buttons
(or a payment link pasted into `buyUrl`), and Quick Pay uses `quickPay.buyUrl` or "Call to pay".

## Setting up "Start an Order"

**Using Tally instead:** build the form in Tally with the steps in
`TALLY-FORM.md`, then paste its link on the `tally:` line in `order-config.js`.
The page then shows the Tally form under photos of common orders. Everything
below is about the built-in form, which is used while `tally` is `""`.

Customers pick what they want, choose a starting example, answer that order type's
questions, add photos and contact info, review, and send. You get one tidy message
with everything, plus an order reference like `WP-261015-K3QZ`.

**Where orders go:**

- **Admin page (always, on the live site):** every order is saved with its photos and
  shows up at `/admin` → **Order Requests**. Mark each one New → Quoted → In progress → Done,
  and reply with one click. Customer uploads can only be opened by someone logged in.
- **Email copy (optional):** create a free form at https://formspree.io and paste its URL as
  `endpoint` in `order-config.js` to also get each order by email.
- **Fallback:** if the site can't save (for example a copy opened from a zip), the customer's
  email app opens with everything filled in.

The order types and questions follow the shop's own checklists (embroidery and military
framing) and the past year of orders: military plaques and framing were most common, then
embroidery and apparel, then plaques and engraving. Every order also asks when it's needed
in hand and whether it will be picked up or shipped (with the address if shipped).

**Changing questions:** each order type in `order-config.js` has a `questions` list.
Question types are `text`, `textarea`, `number`, `date`, `select`, `radio` (pick one)
and `checks` (pick several). Add `required: true` to make one mandatory.
The questions and options there are a sensible starting point; adjust them to
how the shop actually works (for example, your real background and frame choices).

**Example photos:** each order type and example can name a photo from
`images/work/` with `photo: "<name>"` (the file name without `-sm.webp`).
Plaques & Engraving, Guidons and Something Else don't have shop photos yet, so
they still use pictures from the current website (`live:`). Once you have
photos of those, add them to `images/work/` and set `photo:` instead.

## Photos of our work

All shop photos live in `images/work/`. Each one has three files: a full size
`<name>.webp` (shown in the pop-up viewer), and two small copies, `<name>-sm.webp`
(640px) and `<name>-xs.webp` (480px). The browser picks whichever small copy suits
the screen. The list of photos, their groups and captions is `WORK` at the top of
`site.js`. The groups become the filter buttons on the Our Work page.

To add a photo: save all three sizes in `images/work/` (about 1400px, 640px and
480px on the long side, WebP), then add a line to `WORK` with the file name, group and caption. The home
page slideshow, specialties and preview pick their photos by name in
`index.html`; Our Story and Visit pick shop photos the same way.

Pig cursors: `images/cursor-hoof.png` (a hoof print for the normal pointer) and `images/cursor-tail.png` (a curly tail over links and buttons), with `@2x` versions for sharp screens.

Brand images: `images/logo-full.webp` (full logo with the name, used on the home page),
`images/flying-pig.webp` (the flying pig mascot), `images/logo-mark.webp` (header/footer logo), `images/favicon.png`, and `images/painting.webp` (the pig
painting on Our Story). White backgrounds were made transparent.

`images/logo-original.png` is the original logo file. `images/logo.png` is the same
logo with the black background around it made transparent; the site uses that one.

## Speed

- Fonts are hosted in `fonts/` (no trip to Google), and the two main ones are preloaded.
- `_headers` tells browsers to keep photos for a week and fonts for a year. Pages, CSS
  and JS are checked on every visit, so changes show up right away.
- Photos below the first screen load only when scrolled to, and the home slideshow
  loads each photo just before it's shown.

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
