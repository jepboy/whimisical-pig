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

const TAIL_SVG = '<svg class="tail" viewBox="0 0 96 24" aria-hidden="true"><path d="M2 16 C 22 16, 34 16, 42 12 C 50 8, 50 2, 44 3 C 38 4, 38 13, 48 16 C 58 19, 72 16, 94 16"/></svg>';

function buildHeader(current) {
  const el = document.getElementById("site-header");
  if (!el) return;
  const link = (href, label, key) =>
    `<li><a href="${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a></li>`;
  el.className = "site";
  el.innerHTML = `
    <div class="wrap top">
      <a class="brand" href="index.html">
        <img src="images/logo.png" alt="" onerror="this.remove()">
        <span>
          <span class="brand-name">The Whimsical <em>Pig</em></span>
          <span class="brand-tag">we make military framing
            <span class="squiggle">“too easy”<svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true"><path d="M4 12 C 40 4, 70 18, 110 9 S 170 6, 196 12" fill="none" stroke="#eba7b9" stroke-width="3.5" stroke-linecap="round"/></svg></span>
          </span>
        </span>
      </a>
      <nav class="main" aria-label="Main">
        <ul>
          ${link("index.html", "home", "home")}
          ${link("shop.html", "shop", "shop")}
          ${link("order.html", "start an order", "order")}
          <li class="products">
            <button type="button" aria-haspopup="true" aria-expanded="false">products</button>
            <ul class="menu"></ul>
          </li>
          ${link(SITE + "location.html", "location", "")}
          <li><a class="call" href="tel:315-773-3758">315-773-3758</a></li>
        </ul>
      </nav>
    </div>`;

  const menu = el.querySelector(".menu");
  for (const [label, page] of PRODUCTS) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = SITE + page;
    a.textContent = label;
    li.appendChild(a);
    menu.appendChild(li);
  }

  // Products menu: hover on desktop, tap on touch screens
  const prod = el.querySelector(".products");
  const btn = prod.querySelector("button");
  btn.onclick = () => btn.setAttribute("aria-expanded", prod.classList.toggle("open"));
  document.addEventListener("click", e => {
    if (!prod.contains(e.target)) { prod.classList.remove("open"); btn.setAttribute("aria-expanded", false); }
  });
}

function buildFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;
  el.className = "site";
  el.innerHTML = `
    <div class="wrap">
      <div class="foot">
        <div>
          <h3>visit</h3>
          <p><a href="${SITE}location.html">50 Public Square, Suite E1<br>Watertown, New York 13601</a></p>
        </div>
        <div>
          <h3>call</h3>
          <p><a class="phone" href="tel:315-773-3758">315-773-3758</a></p>
        </div>
        <div>
          <h3>hours</h3>
          <p>Monday – Friday: 9:30am – 5:30pm<br>Saturday &amp; Sunday: Closed</p>
        </div>
      </div>
      <div class="fine">
        <span class="oink"><img src="images/logo.png" alt="" onerror="this.remove()">&copy; ${new Date().getFullYear()} The Whimsical Pig</span>
        <a href="https://www.facebook.com/TheWhimsicalPig/" target="_blank" rel="noopener">Find us on Facebook</a>
      </div>
    </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  buildHeader(document.body.dataset.page);
  buildFooter();
  document.querySelectorAll("[data-tail]").forEach(h => h.insertAdjacentHTML("afterend", TAIL_SVG));
});
