// Shared header, footer, product list, and helpers for every Whimsical Pig page.
const SITE = "https://www.thewhimsicalpig.com/";

// Photos of our work, in images/work/ (each has a full size .webp and a small -sm.webp).
// [file name, group, caption]. Groups become the filters on the Our Work page.
const WORK = [
  ...[
    "Guidon shadow box", "Guidon shadow box", "Framed guidon", "Framed guidon", "10th Mountain Division display",
    "Flags & photos shadow box", "Unit colors display", "Flag & medals shadow box", "Guidon & coin display",
    "Battalion spread", "USMC guidon display", "Unit colors display", "Guidon shadow box", "Uniform shadow box",
    "Flag case", "Medals & patches display", "10th Mountain snowshoe", "Helmet plaque",
  ].map((c, i) => ["military-shadow-boxes_" + String(i + 1).padStart(2, "0"), "Military", c]),
  ...["Framed print", "Set of three", "Framed watercolor", "Framed photo", "Framed print", "Framed print", "Signed poster"]
    .map((c, i) => ["art-framing_0" + (i + 1), "Art Framing", c]),
  ...["Framed jerseys", "Framed jacket", "Lacrosse jersey display"]
    .map((c, i) => ["sports-memorabilia_0" + (i + 1), "Sports Memorabilia", c]),
  ...["Embroidered tote", "Embroidered jacket", "Embroidered shirt", "Embroidered patch", "Embroidered shirt",
      "Embroidered hat", "Embroidered hat", "Embroidered hat"]
    .map((c, i) => ["embroidery_0" + (i + 1), "Embroidery", c]),
  ...Array.from({ length: 6 }, (_, i) => ["apparel-printing_0" + (i + 1), "Printing", "Printed shirts"]),
  ...Array.from({ length: 6 }, (_, i) => ["patches_0" + (i + 1), "Patches", "Custom patch"]),
];
const workPhoto = (name, small = true) => "images/work/" + name + (small ? "-sm" : "") + ".webp";
const workItem = name => WORK.find(w => w[0] === name);

const liveImage = file => SITE + "images/" + file;

// Load a photo. Uses `local` (a file in this site's images/ folder) only when that
// file is listed in SETTINGS.localPhotos, otherwise goes straight to `fallback`
// (the photo on the current website), so there are no wasted failed requests.
// If nothing loads, the <img> is removed so its placeholder shows.
function loadImg(img, local, fallback) {
  const listed = (window.SETTINGS && SETTINGS.localPhotos) || [];
  const name = local ? local.replace(/^\/?images\//, "") : "";
  const first = local && (!fallback || listed.includes(name)) ? local : fallback;
  img.decoding = "async";
  img.onerror = () => {
    if (fallback && img.src !== fallback && first !== fallback) img.src = fallback;
    else img.remove();
  };
  if (first) img.src = first; else img.remove();
}

// Gallery of photo tiles. Each opens the big photo in a lightbox
// (or on its own if scripts are off). `items` defaults to every photo.
function renderGallery(container, items = WORK) {
  return items.map(([name, group, cap]) => {
    const a = document.createElement("a");
    a.className = "tile";
    a.href = workPhoto(name, false);
    a.dataset.group = group;
    a.innerHTML = '<div class="pic"><img alt="" loading="lazy" decoding="async"></div><span class="cap"></span>';
    a.querySelector(".cap").textContent = cap;
    const im = a.querySelector("img");
    im.alt = cap;
    im.src = workPhoto(name);
    a.onclick = e => { e.preventDefault(); openLightbox(a); };
    container.appendChild(a);
    return a;
  });
}

// Lightbox: shows a tile's big photo, with previous / next through the tiles
// currently showing in the same gallery.
function openLightbox(tile) {
  let box = document.getElementById("lightbox");
  if (!box) {
    document.body.insertAdjacentHTML("beforeend", `
      <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Photo" hidden>
        <figure><img alt=""><figcaption></figcaption></figure>
        <button type="button" class="lb-close" aria-label="Close">×</button>
        <button type="button" class="lb-prev" aria-label="Previous photo">‹</button>
        <button type="button" class="lb-next" aria-label="Next photo">›</button>
      </div>`);
    box = document.getElementById("lightbox");
    box.querySelector(".lb-close").onclick = () => closeLightbox();
    box.querySelector(".lb-prev").onclick = () => stepLightbox(-1);
    box.querySelector(".lb-next").onclick = () => stepLightbox(1);
    box.onclick = e => { if (e.target === box) closeLightbox(); };
    document.addEventListener("keydown", e => {
      if (box.hidden) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") stepLightbox(-1);
      else if (e.key === "ArrowRight") stepLightbox(1);
    });
  }
  box.current = tile;
  const img = box.querySelector("img");
  img.src = tile.querySelector("img").src;   // small photo shows instantly...
  img.src = tile.href;                        // ...then the big one replaces it
  img.alt = tile.querySelector(".cap").textContent;
  box.querySelector("figcaption").textContent = img.alt;
  if (box.hidden) {
    box.hidden = false;
    document.documentElement.style.overflow = "hidden";
    box.querySelector(".lb-close").focus();
  }
}
function stepLightbox(dir) {
  const box = document.getElementById("lightbox");
  const tiles = [...box.current.parentNode.querySelectorAll(".tile:not([hidden])")];
  const i = tiles.indexOf(box.current);
  openLightbox(tiles[(i + dir + tiles.length) % tiles.length]);
}
function closeLightbox() {
  const box = document.getElementById("lightbox");
  box.hidden = true;
  document.documentElement.style.overflow = "";
  box.current.focus();
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
        <img src="images/logo-mark.webp" alt="" onerror="this.remove()">
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
            <img src="images/logo-mark.webp" alt="" onerror="this.remove()">
            <span><span class="brand-name">The Whimsical Pig</span></span>
          </a>
          <p>We make military framing “too easy.”</p>
          <img class="flying-pig foot-pig" src="images/flying-pig.webp" alt="" loading="lazy">
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

// Build the header right away (this script is loaded just after <header id="site-header">)
// so it appears with the page instead of popping in at the end.
if (document.getElementById("site-header")) buildHeader(document.body.dataset.page);
document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector("header.site")) buildHeader(document.body.dataset.page);
  buildFooter();
  document.querySelectorAll("[data-tail]").forEach(h => h.insertAdjacentHTML("afterend", ORNAMENT));
});
