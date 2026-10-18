// Shared header, footer, product list, and helpers for every Whimsical Pig page.
const SITE = "https://www.thewhimsicalpig.com/";

// Product pages on the current site. [label, page, live image]
const PRODUCTS = [
  ["flag & shadow boxes", "flag---shadow-boxes.html", "button%202.jpg"],
  ["battalion spreads", "battalion-spreads.html", "button%201.jpg"],
  ["regulation guidons", "regulation-guidons.html", "button%205.jpg"],
  ["non regulation guidons", "non-regulation-guidons.html", "button%2020.jpg"],
  ["framed military artwork", "framed-military-artwork.html", "button%203.jpg"],
  ["embroidery", "embroidery.html", "52565901_10161418329605076_7165628496394321920_o.jpg"],
  ["vinyl applied custom apparel", "vinyl-applied-custom-apparel.html", "button%2006.png"],
  ["non military framing", "non-military-framing.html", "button%204.jpg"],
  ["10th mountain snowshoes", "10th-mountain-snowshoes.html", "button%2011.jpg"],
  ["evident truths products", "evident-truths-products.html", "button%20013.png"],
  ["customized gifts", "customized-gifts.html", "button%207.jpg"],
  ["sublimated images on slate", "sublimated-images-on-slate.html", "button%2010.jpg"],
  ["custom designed prints", "custom-designed-prints.html", "button%2012.jpg"],
  ["custom printing", "custom-printing.html", "fb_img_1576654875481.jpg"],
  ["sublimated plates on wooden plaques", "sublimated-plates-on-wooden-plaques.html", "button%2019.jpg"],
  ["racing plaques, awards, etc.", "racing-plaques%2c-awards%2c-etc.html", "button%2018.jpg"],
  ["path tracing", "path-tracing.html", "button%2016.jpg"],
  ["masonic items", "masonic-items.html", "button%2015.png"],
  ["firemen, emt, & leo items", "firemen%2c-emt%2c---leo-items.html", "button%20014.png"],
  ["purple hearts reunited inc.", "purple-hearts-reunited-inc.html", "button%2017.jpg"],
];

const liveImage = file => SITE + "images/" + file;
const slugify = s => s.replace(/&/g, "and").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

// Show `local` (a path in this folder) if it exists, else `fallback` (e.g. the live
// site's photo); if neither loads, remove the <img> so its placeholder shows.
function loadImg(img, local, fallback) {
  img.onerror = () => {
    if (fallback && img.src !== fallback) img.src = fallback;
    else img.remove();
  };
  img.src = local || fallback;
}

// Gallery of framed work tiles, linking to each product's page.
// `items` defaults to every product; returns the tiles it added.
function renderGallery(container, items = PRODUCTS) {
  return items.map(([label, page, live]) => {
    const a = document.createElement("a");
    a.className = "tile";
    a.href = SITE + page;
    a.innerHTML = '<div class="pic"><span class="ph">photo</span><img alt="" loading="lazy"></div><span class="cap"></span>';
    a.querySelector(".cap").textContent = label;
    const im = a.querySelector("img");
    im.alt = label;
    loadImg(im, "images/" + slugify(label) + ".jpg", liveImage(live));
    container.appendChild(a);
    return a;
  });
}

// Small brass ornament placed under section headings marked with data-tail
const ORNAMENT = '<div class="rule-orn" aria-hidden="true"><span></span></div>';

function buildHeader(current) {
  const el = document.getElementById("site-header");
  if (!el) return;
  const link = (href, label, key) =>
    `<li><a href="${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a></li>`;
  const S = window.SETTINGS || {};
  if (S.announcement) {
    const bar = document.createElement("div");
    bar.className = "announce";
    bar.textContent = S.announcement;
    el.parentNode.insertBefore(bar, el);
  }
  el.insertAdjacentHTML("beforebegin", `
    <div class="utility">
      <div class="wrap">
        <span><a href="${SITE}location.html">50 Public Square, Suite E1 · Watertown, NY</a></span>
        <span><span class="hours">Mon – Fri 9:30am – 5:30pm<span class="sep">|</span></span><a href="tel:315-773-3758">315-773-3758</a></span>
      </div>
    </div>`);
  el.className = "site";
  el.innerHTML = `
    <div class="wrap top">
      <a class="brand" href="index.html">
        <img src="images/logo.png?v=2" alt="" onerror="this.remove()">
        <span>
          <span class="brand-name">The Whimsical Pig</span>
          <span class="brand-tag">Military &amp; Custom Framing</span>
        </span>
      </a>
      <nav class="main" aria-label="Main">
        <ul>
          ${link("index.html", "Home", "home")}
          ${link("story.html", "Our Story", "story")}
          ${link("work.html", "Our Work", "work")}
          ${link("shop.html", "Shop", "shop")}
          ${link("order.html", "Start an Order", "order")}
          ${link("help.html", "Help", "help")}
          ${link("visit.html", "Visit", "visit")}
          <li><a class="call" href="tel:315-773-3758">Call Us</a></li>
        </ul>
      </nav>
    </div>`;

}

function buildFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;
  const S = window.SETTINGS || {};
  const extra = [
    S.giftCardUrl && `<li><a href="${S.giftCardUrl}">Gift cards</a></li>`,
    S.reviewsUrl && `<li><a href="${S.reviewsUrl}" target="_blank" rel="noopener">Leave us a review</a></li>`,
  ].filter(Boolean).join("");
  el.className = "site";
  el.innerHTML = `
    <div class="wrap">
      <div class="foot">
        <div>
          <a class="brand" href="index.html">
            <img src="images/logo.png?v=2" alt="" onerror="this.remove()">
            <span><span class="brand-name">The Whimsical Pig</span></span>
          </a>
          <p>We make military framing “too easy.”</p>
          <img class="flying-pig foot-pig" src="images/flying-pig.png" alt="" loading="lazy">
        </div>
        <div>
          <h3>Visit</h3>
          <p><a href="${SITE}location.html">50 Public Square, Suite E1<br>Watertown, New York 13601</a></p>
        </div>
        <div>
          <h3>Hours</h3>
          <p>Monday – Friday<br>9:30am – 5:30pm<br>Saturday &amp; Sunday closed</p>
        </div>
        <div>
          <h3>Contact</h3>
          <ul>
            <li><a href="tel:315-773-3758">315-773-3758</a></li>
            <li><a href="mailto:WhimsicalPig@hotmail.com">WhimsicalPig@hotmail.com</a></li>
            <li><a href="https://www.facebook.com/TheWhimsicalPig/" target="_blank" rel="noopener">Facebook</a></li>
            ${extra}
          </ul>
        </div>
      </div>
      <div class="fine">
        <span>&copy; ${new Date().getFullYear()} The Whimsical Pig · Made with a little whimsy in Watertown, New York</span>
        <span><a href="story.html">Our Story</a> · <a href="work.html">Our Work</a> · <a href="shop.html">Shop</a> · <a href="order.html">Start an Order</a> · <a href="help.html">Help &amp; FAQ</a> · <a href="visit.html">Visit</a></span>
      </div>
    </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  buildHeader(document.body.dataset.page);
  buildFooter();
  document.querySelectorAll("[data-tail]").forEach(h => h.insertAdjacentHTML("afterend", ORNAMENT));
});
