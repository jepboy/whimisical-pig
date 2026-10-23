# Building the order form in Tally

A step-by-step list of everything to type into Tally so the order form asks the
same questions as the website's own form. Takes about 30–45 minutes.

When it's done, paste the form's link into `order-config.js` → `tally:` and the
Start an Order page shows the Tally form (see the end of this page).

---

## How Tally works (2 minutes)

- Go to **tally.so**, sign up free with **Kat's email**, click **Create form**.
- It's like a document: type the question title, press **Enter**, then type **/**
  to pick what kind of answer box goes under it (Multiple choice, Short answer, Date…).
- To make a question **required**, click the question and turn on **Required**
  (the little toggle / asterisk next to it).
- **/page break** starts a new page. Each order type gets its own page.
- **/logic** (Conditional logic) is how you skip pages or show a question only
  for some answers. Exact steps are below each time it's needed.

In the lists below:

- **Type** is what to pick after typing **/**
- ★ means turn on **Required**
- Text in quotes like "e.g. B Co, 2-14 IN" is the **placeholder**
  (click the answer box and type it in the grey hint text)

---

## Page 1: What are you ordering?

Form title: **Start an Order — The Whimsical Pig**

Text block (**/text**) under the title:
> A few quick questions and we'll have everything we need. Questions first?
> Email WhimsicalPig@hotmail.com or call 315-773-3758.

| Question | Type | Options |
| --- | --- | --- |
| What are you ordering? ★ | Multiple choice | Military Framing · Embroidery & Apparel · Plaques & Engraving · Guidons · Custom Framing · Something Else |

Then add **/page break**.

**Logic for page 1** (put it at the bottom of page 1, above the page break):
type **/logic** and add one rule per answer:

| If "What are you ordering?" is… | Then jump to page |
| --- | --- |
| Military Framing | Military Framing |
| Embroidery & Apparel | Embroidery & Apparel |
| Plaques & Engraving | Plaques & Engraving |
| Guidons | Guidons |
| Custom Framing | Custom Framing |
| Something Else | Something Else |

(Name each page with the page title at the top of it, so they're easy to pick here.)

---

## Page 2: Military Framing

Page title: **Military Framing**

| Question | Type | Options / placeholder |
| --- | --- | --- |
| Which style is closest? | Multiple choice | Farewell / Leadership Plaque · Retirement Shadow Box · Framed Guidon Display · Something different |
| What company / unit are you with? ★ | Short answer | "e.g. B Co, 2-14 IN, 10th Mountain Division" |
| Who is it for? Rank and name as it should appear ★ | Short answer | "e.g. SFC John A. Smith" |
| Position or callsign | Short answer | "Optional, e.g. Company Commander, Hydra 6" |
| Dates of service | Short answer | "e.g. October 2023 – June 2026" |
| Plate wording / dedication | Long answer | "e.g. From the Officers, NCOs and Soldiers of B Company. Thank you for your leadership." |
| What items do you want to include? | Checkboxes | Rank · Unit crest · Coins · Patches · Pins · Ribbons / medals · Wings / badges · Folded flag · Photos · Other |
| Where are the items coming from? | Multiple choice | I'll bring or ship them · Please get the rank / crest for us · A mix of both |
| What guidon or battalion colors would you like to include? ★ | Short answer | "e.g. infantry blue background, red and white guidon colors" |
| Mat and frame colors | Short answer | "Optional, e.g. black mat over gray, black frame" |
| Same as a past order? | Short answer | "Order # or name on the earlier piece (optional)" |

**Logic at the bottom of this page:** If "What are you ordering?" is
Military Framing → jump to page **Your Details**.
Then **/page break**.

---

## Page 3: Embroidery & Apparel

Page title: **Embroidery & Apparel**

Text block first:
> First time with a logo? There's a one-time **$45 digitizing fee**, plus a price
> based on how many stitches it is. Once we have your logo on file, it's just based
> on the stitch count.

| Question | Type | Options / placeholder |
| --- | --- | --- |
| Will you be providing the garments, or should we? ★ | Multiple choice | I'll provide the garments · Please provide the garments |
| What items? ★ | Short answer | "e.g. black polos, navy hats, grey hoodies" |
| Garment colors | Short answer | "e.g. black, heather grey" |
| Total quantity ★ | Number | Minimum 1 |
| Sizes & how many of each | Long answer | "e.g. S ×4, M ×10, L ×8, XL ×3" |
| Have we done this logo for you before? ★ | Multiple choice | No, it's a new logo · Yes, you have it on file |
| Words you'd like (if there's no logo) | Long answer | "Exactly as it should read. Upload a photo of your logo on the next page." |
| Placement | Checkboxes | Left chest · Full front · Back · Sleeve · Hat front |
| Decoration | Multiple choice | Embroidery · Vinyl · Printing · Patches · Not sure — recommend one |

**Logic, only ask "Garment colors" when we're providing them:** right under the
"Will you be providing the garments" question, type **/logic**:
If "Will you be providing the garments, or should we?" is "Please provide the
garments" → **Show blocks** → pick "Garment colors". (Blocks you show this way
stay hidden until the answer matches.)

**Logic at the bottom of this page:** If "What are you ordering?" is
Embroidery & Apparel → jump to page **Your Details**.
Then **/page break**.

---

## Page 4: Plaques & Engraving

Page title: **Plaques & Engraving**

| Question | Type | Options / placeholder |
| --- | --- | --- |
| Which is closest? | Multiple choice | Engraved Plates · Award Plaque · League & Race Awards · Something different |
| What's it for? ★ | Short answer | "e.g. golf league, retirement, appreciation" |
| How many? ★ | Number | Minimum 1 |
| Plate or plaque size | Short answer | "Optional, e.g. 4 1/8 × 1 1/4 in" |
| Engraving text | Long answer | "Exactly as you want it to read. One block per plate if they differ." |
| Logo or artwork? | Multiple choice | Yes (uploading on the next page) · No |
| Same as a past order? | Short answer | "Order # (optional)" |

**Logic at the bottom:** If "What are you ordering?" is Plaques & Engraving →
jump to page **Your Details**. Then **/page break**.

---

## Page 5: Guidons

Page title: **Guidons**

| Question | Type | Options / placeholder |
| --- | --- | --- |
| Which kind? | Multiple choice | Regulation Guidon · Non-Regulation Guidon · Not sure |
| What company / unit are you with? ★ | Short answer | "e.g. B Co, 2-14 IN" |
| How many? ★ | Number | Minimum 1 |
| Guidon colors ★ | Short answer | "e.g. red with white lettering" |
| Symbols, lettering or design notes | Long answer | "Upload a photo or artwork on the next page if you have it" |
| Framed for display? | Multiple choice | Just the guidon · Framed with a dedication plate |

**Logic at the bottom:** If "What are you ordering?" is Guidons → jump to page
**Your Details**. Then **/page break**.

---

## Page 6: Custom Framing

Page title: **Custom Framing**

| Question | Type | Options / placeholder |
| --- | --- | --- |
| What are we framing? ★ | Short answer | "e.g. a jersey, a watercolor, a diploma" |
| Size (width × height) | Short answer | "e.g. 16 × 20 in" |
| Glass | Dropdown | Help me choose · Regular · UV protective · Non-glare |
| Mat | Dropdown | Help me choose · Single mat · Double mat · No mat |
| Frame style or colors you like | Long answer | "Optional" |

**Logic at the bottom:** If "What are you ordering?" is Custom Framing → jump to
page **Your Details**. Then **/page break**.

---

## Page 7: Something Else

Page title: **Something Else**

| Question | Type | Options / placeholder |
| --- | --- | --- |
| Tell us what you have in mind ★ | Long answer | "Gifts, slate, tumblers, prints, anything" |
| How many? | Number | Minimum 1 |

No logic needed; the next page is Your Details. Add **/page break**.

---

## Page 8: Your Details (everyone ends here)

Page title: **Your Details**

| Question | Type | Options / placeholder |
| --- | --- | --- |
| Your name ★ | Short answer | |
| Phone ★ | Phone number | |
| Email ★ | Email | |
| When do you need it in your hands? ★ | Date | |
| Will this be picked up or shipped? ★ | Multiple choice | I'll pick it up at the shop · Ship it to me |
| Shipping address | Long answer | "Street, city, state, ZIP" (turn on ★ Required) |
| Getting your items to us | Multiple choice | I'll drop them off at the shop · I'll mail them · No items to send |
| Best way to reach you | Multiple choice | Call · Text · Email |
| Photos of your logo, items or ideas | File upload | Allow multiple files if the setting is there (10 MB per file on the free plan) |
| Anything else we should know? | Long answer | |

**Logic, only ask for the address when shipping:** right under "Will this be
picked up or shipped?", type **/logic**: If it is "Ship it to me" → **Show
blocks** → pick "Shipping address". Because it's hidden unless shown, the
Required setting only applies to people shipping.

---

## Thank-you page

At the very end, type **/thank you page** (or click the **Thank you page** button
under the last page) and put:

> **Order received!** Thanks! We'll look everything over and reach out with a quote.
> Questions? Call 315-773-3758 or email WhimsicalPig@hotmail.com.

---

## Settings (important)

1. **Email to Kat:** open the form's **Settings** → **Email notifications** →
   turn on **Self email notifications** and make sure it's Kat's address. Every
   order then lands in her inbox with all the answers and photo links.
2. **Reply to the customer:** if the notification settings offer a **Reply-to**
   option, set it to the **Email** question so hitting Reply in Kat's inbox goes to
   the customer. (If it's a paid-only option, just reply to the email address in
   the order.)
3. Click **Publish**, then **Share** and copy the link. It looks like
   `https://tally.so/r/abc123`.

**Test it:** fill it out once as each order type (Military, Embroidery, and one
with "Ship it to me") and check that the right pages show, the address only appears
when shipping, and the email arrives.

---

## Putting it on the website

Open `order-config.js` and paste the link on the `tally:` line:

```js
tally: "https://tally.so/r/abc123",
```

(Or just send the link and it'll get added.) The Start an Order page then shows the
Tally form under the example photos. Leave it `""` to keep the website's built-in
form instead.
