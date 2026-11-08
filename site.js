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
// Banners and photo changes made on the admin page (see siteChanges below)
let SITE_CHANGES = null;
const swapped = name => SITE_CHANGES && SITE_CHANGES.replace[name];
const workPhoto = (name, small = true) => swapped(name)
  ? `/api/photo/${swapped(name)}${small ? "?s=sm" : ""}`
  : "images/work/" + name + (small ? "-sm" : "") + ".webp";
// Lets the browser pick the 480px or 640px copy to suit the tile and the screen
function useThumbs(img, name, sizes) {
  img.dataset.key = name;
  if (swapped(name)) { img.removeAttribute("srcset"); img.src = workPhoto(name); return; }
  img.sizes = sizes;
  img.srcset = `images/work/${name}-xs.webp 480w, images/work/${name}-sm.webp 640w`;
  img.src = workPhoto(name);
}
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
  if (items === WORK) container.dataset.all = "";    // photos added on the admin page join this one
  const tiles = items.map(([name, group, cap]) => {
    const a = document.createElement("a");
    a.className = "tile";
    a.href = workPhoto(name, false);
    a.dataset.group = group;
    a.innerHTML = '<div class="pic"><img alt="" loading="lazy" decoding="async"></div><span class="cap"></span>';
    a.querySelector(".cap").textContent = cap;
    const im = a.querySelector("img");
    im.alt = cap;
    useThumbs(im, name, "(max-width: 640px) 50vw, (max-width: 900px) 33vw, 280px");
    a.onclick = e => { e.preventDefault(); openLightbox(a); };
    container.appendChild(a);
    return a;
  });
  if (SITE_CHANGES) tiles.forEach(t => applyPhoto(t.querySelector("img"), SITE_CHANGES));
  return tiles.filter(t => t.isConnected);
}

// ---------- Banners and photos from the admin page ----------
// /api/site lists the banners to show and any photo changes. It's kept for a
// minute per visit so moving between pages doesn't ask again.
const siteChanges = (() => {
  if (location.protocol === "file:") return Promise.resolve(null);
  if (document.body && "noSiteChanges" in document.body.dataset) return Promise.resolve(null);   // the admin page
  // The admin page bumps "wp-site-ver" after a change, so this browser sees it right away
  let ver = "";
  try { ver = localStorage.getItem("wp-site-ver") || ""; } catch (e) {}
  try {
    const c = JSON.parse(sessionStorage.getItem("wp-site"));
    if (c && c.ver === ver && Date.now() - c.at < 60000) return Promise.resolve(c.data);
  } catch (e) {}
  return fetch("/api/site" + (ver ? "?v=" + encodeURIComponent(ver) : "")).then(r => r.ok ? r.json() : null).then(d => {
    try { sessionStorage.setItem("wp-site", JSON.stringify({ at: Date.now(), ver, data: d })); } catch (e) {}
    return d;
  }).catch(() => null);
})();

// Which site photo an <img> shows: a work photo name, or a file in images/
function photoKeyOf(img) {
  if (img.dataset.key) return img.dataset.key;
  const src = img.getAttribute("src") || "";
  const m = src.match(/images\/work\/([\w-]+?)(?:-sm|-xs)?\.webp$/) || src.match(/(images\/[\w\-./]+)$/);
  return m ? (img.dataset.key = m[1]) : null;
}
function applyPhoto(img, d) {
  if (!img) return;
  const key = photoKeyOf(img);
  if (!key) return;
  const tile = img.closest(".tile");
  if (tile && d.hidden.includes(key)) { tile.remove(); return; }
  const id = d.replace[key];
  if (id && !img.src.includes("/api/photo/")) {
    const small = img.hasAttribute("srcset") || /-(sm|xs)\.webp$/.test(img.getAttribute("src") || "");
    img.removeAttribute("srcset");
    img.src = `/api/photo/${id}${small ? "?s=sm" : ""}`;
    if (tile) tile.href = `/api/photo/${id}`;
  }
  if (tile && d.captions[key]) {
    tile.querySelector(".cap").textContent = img.alt = d.captions[key];
  }
}

function addedTiles(container, d) {
  for (const p of d.added) {
    if (container.querySelector(`[data-photo="${p.id}"]`)) continue;
    const a = document.createElement("a");
    a.className = "tile";
    a.href = `/api/photo/${p.id}`;
    a.dataset.group = p.group || "More";
    a.dataset.photo = p.id;
    a.innerHTML = '<div class="pic"><img alt="" loading="lazy" decoding="async"></div><span class="cap"></span>';
    a.querySelector(".cap").textContent = p.caption;
    const im = a.querySelector("img");
    im.alt = p.caption || "Our work";
    im.src = `/api/photo/${p.id}?s=sm`;
    a.onclick = e => { e.preventDefault(); openLightbox(a); };
    container.appendChild(a);
  }
}

function renderBanners(list) {
  const page = document.body.dataset.page || "";
  const mine = list.filter(b => b.pages.includes("all") || b.pages.includes(page));
  const header = document.getElementById("site-header");
  const utility = document.querySelector(".utility");
  for (const b of mine.filter(b => b.kind === "bar")) {
    const bar = document.createElement("div");
    bar.className = "announce style-" + b.style;
    const words = document.createElement("span");
    words.textContent = [b.title, b.text].filter(Boolean).join(" · ");
    bar.appendChild(words);
    if (b.link) {
      const a = document.createElement("a");
      a.href = b.link;
      a.textContent = (b.button || "Learn more") + " →";
      bar.appendChild(a);
    }
    if (utility) utility.before(bar); else if (header) header.before(bar);
  }
  const main = document.querySelector("main");
  const feats = mine.filter(b => b.kind === "feature");
  if (!main || !feats.length) return;
  const after = main.firstElementChild;
  for (const b of feats.reverse()) {
    const sec = document.createElement("section");
    sec.className = "feature-banner style-" + b.style;
    sec.innerHTML = '<div class="wrap"><div class="fb-in"><div class="fb-words"><h2></h2><p></p></div></div></div>';
    const inner = sec.querySelector(".fb-in");
    if (b.photo) {
      const im = document.createElement("img");
      im.src = `/api/photo/${b.photo}?s=sm`;
      im.alt = "";
      im.decoding = "async";
      inner.prepend(im);
    }
    sec.querySelector("h2").textContent = b.title;
    sec.querySelector("p").textContent = b.text;
    if (!b.title) sec.querySelector("h2").remove();
    if (!b.text) sec.querySelector("p").remove();
    if (b.link) {
      const a = document.createElement("a");
      a.className = "btn";
      a.href = b.link;
      a.textContent = b.button || "Learn more";
      sec.querySelector(".fb-words").appendChild(a);
    }
    if (after) after.after(sec); else main.prepend(sec);
  }
}

siteChanges.then(d => {
  if (!d) return;
  d = { banners: [], hidden: [], captions: {}, replace: {}, added: [], ...d };
  SITE_CHANGES = d;
  const go = () => {
    if ("noSiteChanges" in document.body.dataset) return;     // the admin page shows the originals
    renderBanners(d.banners);
    document.querySelectorAll("[data-all]").forEach(c => addedTiles(c, d));
    document.querySelectorAll("img").forEach(img => applyPhoto(img, d));
    document.dispatchEvent(new CustomEvent("site-changes", { detail: d }));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
});

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
  img.removeAttribute("srcset");
  img.src = tile.querySelector("img").currentSrc;   // small photo shows instantly...
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
        <span><a href="visit.html">50 Public Square, Suite E1 · Watertown, NY</a></span>
        <span><span class="hours">Mon – Fri 9am – 5pm<span class="sep">|</span></span><a href="tel:315-773-3758">315-773-3758</a></span>
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
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="main-nav">
        <span class="bars" aria-hidden="true"><i></i><i></i><i></i></span>Menu
      </button>
      <nav class="main" id="main-nav" aria-label="Main">
        <ul>
          ${link("index.html", "Home", "home")}
          ${link("story.html", "Our Story", "story")}
          ${link("work.html", "Our Work", "work")}
          ${link("design.html", "Design &amp; Merch", "design")}
          ${link("shop.html", "Shop", "shop")}
          ${link("order.html", "Start an Order", "order")}
          ${link("help.html", "Help", "help")}
          ${link("visit.html", "Visit", "visit")}
          <li><a class="call" href="mailto:WhimsicalPig@hotmail.com">Email Us</a></li>
        </ul>
      </nav>
    </div>`;

  // Phones: the links fold into a Menu button
  const btn = el.querySelector(".menu-btn");
  const setOpen = open => { el.classList.toggle("open", open); btn.setAttribute("aria-expanded", open); };
  btn.onclick = () => setOpen(!el.classList.contains("open"));
  el.querySelector("nav").addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && el.classList.contains("open")) { setOpen(false); btn.focus(); } });

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
          <p><a href="visit.html">50 Public Square, Suite E1<br>Watertown, New York 13601</a></p>
        </div>
        <div>
          <h3>Hours</h3>
          <p>Monday – Friday<br>9am – 5pm<br>Saturday &amp; Sunday closed</p>
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
        <span><a href="story.html">Our Story</a> · <a href="work.html">Our Work</a> · <a href="design.html">Design &amp; Merch</a> · <a href="shop.html">Shop</a> · <a href="order.html">Start an Order</a> · <a href="help.html">Help &amp; FAQ</a> · <a href="visit.html">Visit</a></span>
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
