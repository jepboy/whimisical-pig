// Facebook Posts tab on the admin page: makes a branded picture for a Facebook
// post (photo + words + logo), sized for Facebook, plus a ready-to-paste caption.
// Everything is drawn in the browser; nothing is uploaded or saved.
// Uses admin.html's helpers: $, esc, site, loadSite, builtinSrc, WORK, PAGE_SECTIONS.

(function () {
  const SITE = "thewhimsicalpig.com";
  const URL_ = "https://" + SITE;
  const ADDRESS = "50 Public Square, Suite E1, Watertown";
  const PHONE = "315-773-3758";
  const FOOTER = `${SITE}  ·  ${PHONE}`;

  const SIZES = {
    square: { name: "Post: square (best for most posts)", w: 1080, h: 1080 },
    tall:   { name: "Post: tall (takes up more of the feed)", w: 1080, h: 1350 },
    wide:   { name: "Post: wide (good with a link)", w: 1200, h: 630 },
    story:  { name: "Story", w: 1080, h: 1920 },
    cover:  { name: "Page cover photo", w: 1640, h: 624 },
    event:  { name: "Event cover photo", w: 1920, h: 1005 },
  };
  const LOOKS = {
    band:  { name: "Photo with a black band", photo: true },
    fade:  { name: "Words on top of the photo", photo: true },
    blush: { name: "Light pink, no photo", photo: false },
    black: { name: "Black, no photo", photo: false },
  };
  const TAGS = "#TheWhimsicalPig #WatertownNY #FortDrum #ShopLocal";

  // Starting points: each fills in the words and caption, which can then be changed
  const PRESETS = {
    piece: { name: "Show off a piece", look: "band", photo: "military-shadow-boxes_10",
      head: "Fresh off the workbench", sub: "A custom battalion spread, made right here in Watertown.",
      caption: `Fresh off the workbench! 🐷 This [tell them about the piece] is all finished and ready to go home.\n\nWant something like it? Start an order at ${URL_}/order or stop by ${ADDRESS}.` },
    military: { name: "Military framing", look: "fade", photo: "military-shadow-boxes_11",
      head: "Military framing, made “too easy”", sub: "Shadow boxes, guidons, flags and unit gifts.",
      caption: `PCS, retirement or change of command coming up? We frame shadow boxes, guidons, flags and unit gifts, and we make it "too easy."\n\nStart your order online at ${URL_}/order or come see us at ${ADDRESS}.` },
    shop: { name: "New in the shop", look: "band", photo: "apparel-printing_01",
      head: "New in the shop!", sub: "Order online any time, pick up downtown or have it shipped.",
      caption: `New in the shop! 🛍️ [Tell them what's new.]\n\nOrder online at ${URL_}/shop and pick it up downtown or have it shipped.` },
    event: { name: "Come see us at an event", look: "band", photo: "shop_02",
      head: "Come see us!", sub: "We'll be at [the event] on [the date] with all-new merch.",
      caption: `Come see us! 🐷 We'll be at [the event] on [the date] with all-new shirts and more. Stop by and say hi!\n\nCan't make it? Shop online any time at ${URL_}/shop.` },
    deadline: { name: "Order-by date", look: "black",
      head: "Order by December 1", sub: "for framed gifts ready in time for the holidays.",
      caption: `Thinking of a framed gift for the holidays? 🎁 Please get your order in by December 1 so it's ready in time.\n\nStart your order at ${URL_}/order or stop by ${ADDRESS}.` },
    closed: { name: "Closed / holiday hours", look: "black",
      head: "Closed Friday", sub: "We're back Monday at 9am. You can still order online any time.",
      caption: `Heads up: we're closed this Friday for [the holiday]. We're back Monday at 9am.\n\nYou can still start an order online any time at ${URL_}/order.` },
    hours: { name: "Hours & location", look: "fade", photo: "shop_06",
      head: "Stop on in", sub: "Monday to Friday, 9am to 5pm · 50 Public Square, Suite E1",
      caption: `Stop on in! We're open Monday to Friday, 9am to 5pm, at ${ADDRESS}. Bring your flags, medals, jerseys and memories, and we'll help you plan the perfect piece.\n\n📞 ${PHONE}` },
    review: { name: "Ask for reviews", look: "blush",
      head: "Loved your piece?", sub: "A quick Google review helps other families and units find us.",
      caption: `Loved your piece? 💕 A quick Google review means the world to a small family shop, and it helps other families and units find us.\n\nLeave one here: ${URL_}/review\n\nThank you!` },
    thanks: { name: "Thank you", look: "blush",
      head: "Thank you, Watertown!", sub: "Three generations of whimsy, all because of you.",
      caption: `Thank you to everyone who has trusted us with their memories. 💕 Three generations of whimsy, all because of you.` },
    cover: { name: "Page cover photo", look: "fade", photo: "shop_04", size: "cover",
      head: "Military & custom framing · Embroidery · Gifts", sub: "Downtown Watertown since 2003",
      caption: "" },
  };

  const st = { preset: "piece", size: "square", look: "band", head: "", sub: "", footer: true, logo: true,
               photo: null, zoom: 100, px: 50, py: 50 };
  let drawn = false, ticket = 0;
  const imgs = new Map();
  const loadImg = src => {
    if (!imgs.has(src)) imgs.set(src, new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; }));
    return imgs.get(src);
  };

  // Every photo on the site, with any the shop replaced on the Site Photos tab
  function photoList() {
    const ph = (site && site.photos) || { replace: {}, hidden: [] };
    const out = [], seen = new Set();
    const add = (key, label) => {
      if (seen.has(key)) return; seen.add(key);
      const id = ph.replace[key];
      out.push({ key, label, thumb: id ? `/api/photo/${id}?s=sm` : builtinSrc(key), full: id ? `/api/photo/${id}` : key.startsWith("images/") ? key : `images/work/${key}.webp` });
    };
    for (const u of ((site && site.uploads) || []).filter(u => u.kind === "gallery")) {
      const k = "upload-" + u.id;
      seen.add(k); out.push({ key: k, label: u.caption || u.grp, thumb: `/api/photo/${u.id}?s=sm`, full: `/api/photo/${u.id}` });
    }
    for (const sec of PAGE_SECTIONS) for (const [k, name] of sec.photos) if (!/logo/.test(k)) add(k, name);
    for (const [k, , cap] of WORK) if (!ph.hidden.includes(k)) add(k, cap);
    return out;
  }
  const logoSrc = () => {
    const id = site && site.photos && site.photos.replace["images/logo-full.webp"];
    return id ? `/api/photo/${id}` : "images/logo-full.webp?v=2";
  };

  // ---------- text ----------
  const serif = s => `600 ${s}px "Cormorant Garamond", Georgia, serif`;
  const sans = (s, w = 400) => `${w} ${s}px Lato, Arial, sans-serif`;
  function wrap(ctx, text, maxW) {
    const lines = [];
    for (const para of String(text).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const t = line ? line + " " + word : word;
        if (line && ctx.measureText(t).width > maxW) { lines.push(line); line = word; } else line = t;
      }
      lines.push(line);
    }
    return lines;
  }
  // Biggest size that fits in maxLines. A slightly smaller size on fewer lines wins
  // over a big size with one word left hanging on its own line.
  function fit(ctx, text, font, maxW, maxLines, start, min) {
    const step = Math.max(1, start * 0.03);
    for (let n = 1; n <= maxLines; n++) {
      const floor = n === maxLines ? min : Math.max(min, start * 0.8);
      for (let size = start; size >= floor; size -= step) {
        ctx.font = font(size);
        const lines = wrap(ctx, text, maxW);
        if (lines.length <= n && lines.every(l => ctx.measureText(l).width <= maxW)) return { font: font(size), size, lines };
      }
    }
    ctx.font = font(min);
    return { font: font(min), size: min, lines: wrap(ctx, text, maxW) };
  }
  // A stack of text pieces; measure() gives its height, draw() paints it from the top
  function block(ctx, pieces, x, w, align) {
    const items = pieces.filter(p => p.text && p.text.trim()).map(p => ({ ...p, ...fit(ctx, p.text, p.font, w, p.lines, p.start, p.min) }));
    const lh = it => it.size * (it.lh || 1.15);
    const height = items.reduce((s, it, i) => s + it.lines.length * lh(it) + (i < items.length - 1 ? (it.gap || 0) : 0), 0);
    return {
      height,
      draw(y) {
        ctx.textAlign = align; ctx.textBaseline = "alphabetic";
        const tx = align === "center" ? x + w / 2 : x;
        for (const it of items) {
          ctx.font = it.font; ctx.fillStyle = it.color;
          for (const l of it.lines) { y += lh(it); ctx.fillText(l, tx, y - it.size * (it.lh ? (it.lh - 1) / 2 + 0.22 : 0.29)); }
          y += it.gap || 0;
        }
      },
    };
  }

  // ---------- drawing ----------
  function drawPhoto(ctx, img, x, y, w, h) {
    const z = st.zoom / 100;
    const scale = Math.max(w / img.width, h / img.height) * z;
    const sw = w / scale, sh = h / scale;
    const sx = (img.width - sw) * (st.px / 100), sy = (img.height - sh) * (st.py / 100);
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
  function drawLogo(ctx, logo, x, y, w, shadow) {
    if (!logo) return 0;
    const h = w * logo.height / logo.width;
    if (shadow) { ctx.save(); ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = w * 0.06; }
    ctx.drawImage(logo, x, y, w, h);
    if (shadow) ctx.restore();
    return h;
  }

  async function render() {
    const my = ++ticket;
    const cv = $("social-canvas"), ctx = cv.getContext("2d");
    const { w: W, h: H } = SIZES[st.size];
    const look = LOOKS[st.look];
    const pic = look.photo && st.photo ? st.photo : null;
    let photo = null, logo = null, pig = null;
    try {
      await Promise.all([
        document.fonts.load(serif(40)), document.fonts.load(sans(40)), document.fonts.load(sans(40, 700)),
        pic && loadImg(pic.full).then(i => photo = i),
        st.logo && loadImg(logoSrc()).then(i => logo = i).catch(() => loadImg("images/logo-full.webp?v=2").then(i => logo = i)),
        !look.photo && loadImg("images/flying-pig.webp").then(i => pig = i),
      ]);
    } catch (e) { $("social-msg").textContent = "Couldn't load that photo. Try another one."; }
    if (my !== ticket) return;
    cv.width = W; cv.height = H;
    const u = Math.min(W, H) / 100;
    const story = st.size === "story", wideish = W / H >= 1.6;
    const top = story ? H * 0.13 : 0, bottom = story ? H * 0.17 : 0;   // Stories cover these with buttons
    // A cover photo is cut off at the sides on phones; keep words in the middle
    const safeW = st.size === "cover" ? Math.min(W, H * 1.75) : W;
    const foot = st.footer ? FOOTER : "";
    const tu = story ? u * 1.2 : u;   // bigger words on a Story, which fills the phone

    ctx.clearRect(0, 0, W, H);
    if (look.photo) {
      ctx.fillStyle = "#141112"; ctx.fillRect(0, 0, W, H);
      const pad = 6 * u;
      if (st.look === "band" && wideish) {
        // photo on the left, black panel on the right
        const pw = Math.round(W * 0.56), panelX = pw, panelW = W - pw;
        if (photo) drawPhoto(ctx, photo, 0, 0, pw, H); else noPhoto(ctx, 0, 0, pw, H, u);
        ctx.fillStyle = "#e7a3b8"; ctx.fillRect(pw, 0, 0.9 * u, H);
        const ix = panelX + pad, iw = panelW - pad * 2;
        const lw = logo ? Math.min(iw * 0.62, H * 0.3 * logo.width / logo.height) : 0;
        const b = block(ctx, [
          { text: st.head, font: serif, lines: 3, start: 11 * tu, min: 6 * tu, color: "#f6eef0", gap: 2.6 * u, lh: 1.06 },
          { text: st.sub, font: sans, lines: 3, start: 4.4 * tu, min: 3.2 * tu, color: "#e7a3b8", gap: 3.6 * u, lh: 1.3 },
          { text: foot, font: s => sans(s, 700), lines: 2, start: 3 * tu, min: 2.4 * tu, color: "#bba7ae", lh: 1.3 },
        ], ix, iw, "center");
        const lh = logo ? lw * logo.height / logo.width : 0;
        const total = lh + (lh ? 4 * u : 0) + b.height;
        let y = Math.max(pad, (H - total) / 2);
        if (logo) { drawLogo(ctx, logo, ix + (iw - lw) / 2, y, lw); y += lh + 4 * u; }
        b.draw(y);
      } else if (st.look === "band") {
        // photo on top, black band underneath (as tall as the words need)
        const lw = logo ? W * (story ? 0.2 : 0.26) : 0, lh = logo ? lw * logo.height / logo.width : 0;
        const tx = (W - safeW) / 2 + pad, tw = safeW - pad * 2 - (lw ? lw + pad * 0.8 : 0);
        const b = block(ctx, [
          { text: st.head, font: serif, lines: 2, start: 9 * tu, min: 5 * tu, color: "#f6eef0", gap: 1.8 * u, lh: 1.06 },
          { text: st.sub, font: sans, lines: 3, start: 3.8 * tu, min: 2.8 * tu, color: "#e7a3b8", gap: 2.6 * u, lh: 1.3 },
          { text: foot, font: s => sans(s, 700), lines: 2, start: 2.7 * tu, min: 2 * tu, color: "#bba7ae", lh: 1.3 },
        ], tx, tw, "left");
        const b0 = { square: 0.3, tall: 0.28, story: 0.22 }[st.size] || 0.32;
        const inner = Math.round(Math.max(H * b0, b.height + pad * 1.5, lh + pad * 1.4));
        const ph = H - bottom - inner - 0.9 * u;
        if (photo) drawPhoto(ctx, photo, 0, 0, W, ph); else noPhoto(ctx, 0, 0, W, ph, u);
        ctx.fillStyle = "#e7a3b8"; ctx.fillRect(0, ph, W, 0.9 * u);
        const by = ph + 0.9 * u;
        b.draw(by + (inner - b.height) / 2);
        if (logo) drawLogo(ctx, logo, tx + tw + pad * 0.8, by + (inner - lh) / 2, lw);
      } else {
        // words on top of the photo, darkened at the bottom
        if (photo) drawPhoto(ctx, photo, 0, 0, W, H); else noPhoto(ctx, 0, 0, W, H, u);
        const g = ctx.createLinearGradient(0, H * (wideish ? 0.25 : 0.4), 0, H);
        g.addColorStop(0, "rgba(11,9,10,0)"); g.addColorStop(0.55, "rgba(11,9,10,.72)"); g.addColorStop(1, "rgba(11,9,10,.92)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        if (logo) {   // a soft shade at the top so the logo stands out on a busy photo
          const g2 = ctx.createLinearGradient(0, 0, 0, top + H * (wideish ? 0.42 : 0.26));
          g2.addColorStop(0, "rgba(11,9,10,.7)"); g2.addColorStop(1, "rgba(11,9,10,0)");
          ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
        }
        const tx = (W - safeW) / 2 + pad, tw = safeW - pad * 2;
        if (logo) {
          const lw = Math.min(safeW * 0.36, (wideish ? 34 : 26) * u * logo.width / logo.height);
          const centerLogo = st.size === "cover";
          drawLogo(ctx, logo, centerLogo ? (W - lw) / 2 : tx, top + pad * 0.8, lw, true);
        }
        const center = st.size === "cover";
        const b = block(ctx, [
          { text: st.head, font: serif, lines: wideish ? 2 : 3, start: (wideish ? 10.5 : 9.5) * tu, min: 5 * tu, color: "#fff", gap: 1.8 * u, lh: 1.06 },
          { text: st.sub, font: sans, lines: 2, start: 4 * tu, min: 2.8 * tu, color: "#f4c7d5", gap: 2.8 * u, lh: 1.3 },
          { text: foot, font: s => sans(s, 700), lines: 1, start: 2.8 * tu, min: 2.1 * tu, color: "#e7a3b8", lh: 1.3 },
        ], tx, tw, center ? "center" : "left");
        b.draw(H - bottom - pad - b.height);
      }
    } else {
      // plain card
      const dark = st.look === "black";
      ctx.fillStyle = dark ? "#141112" : "#f9e4eb"; ctx.fillRect(0, 0, W, H);
      const pad = 8 * u;
      ctx.strokeStyle = dark ? "rgba(231,163,184,.55)" : "#1a0f13"; ctx.lineWidth = 0.5 * u;
      const ins = 3.2 * u;
      roundRect(ctx, ins, ins + top * 0.6, W - ins * 2, H - ins * 2 - (top + bottom) * 0.6, 3 * u); ctx.stroke();
      if (pig) {
        const pw = 18 * u, phh = pw * pig.height / pig.width;
        ctx.save(); ctx.globalAlpha = dark ? 0.9 : 1;
        ctx.drawImage(pig, W - ins - pw - 2.5 * u, ins + top * 0.6 + 2.5 * u, pw, phh); ctx.restore();
      }
      const tx = (W - safeW) / 2 + pad, tw = safeW - pad * 2;
      const b = block(ctx, [
        { text: st.head, font: serif, lines: 3, start: (wideish ? 12 : 11) * tu, min: 6 * tu, color: dark ? "#f6eef0" : "#1a0f13", gap: 2.6 * u, lh: 1.06 },
        { text: st.sub, font: sans, lines: 3, start: 4.6 * tu, min: 3.2 * tu, color: dark ? "#e7a3b8" : "#c9505b", gap: 4 * u, lh: 1.3 },
        { text: foot, font: s => sans(s, 700), lines: 1, start: 3 * tu, min: 2.2 * tu, color: dark ? "#bba7ae" : "#3a2a30", lh: 1.3 },
      ], tx, tw, "center");
      const lw = logo ? Math.min(tw * 0.5, (story ? 36 : wideish ? 30 : 26) * u * logo.width / logo.height) : 0;
      const lh = logo ? lw * logo.height / logo.width : 0;
      const total = lh + (lh ? 5 * u : 0) + b.height;
      let y = top + Math.max(pad, (H - top - bottom - total) / 2);
      if (logo) { drawLogo(ctx, logo, (W - lw) / 2, y, lw); y += lh + 5 * u; }
      b.draw(y);
    }
    drawn = true;
    $("social-dims").textContent = `${W} × ${H} pixels`;
  }
  function noPhoto(ctx, x, y, w, h, u) {
    ctx.fillStyle = "#2a2124"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#bba7ae"; ctx.font = sans(4 * u, 700); ctx.textAlign = "center";
    ctx.fillText("Pick a photo", x + w / 2, y + h / 2);
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---------- controls ----------
  let pending = 0;
  const redraw = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(render); };
  const resetPhotoPos = () => { st.zoom = 100; st.px = 50; st.py = 50; $("sm-zoom").value = 100; $("sm-px").value = 50; $("sm-py").value = 50; };
  function syncForm() {
    $("sm-size").value = st.size; $("sm-look").value = st.look; $("sm-head").value = st.head; $("sm-sub").value = st.sub;
    $("sm-footer").checked = st.footer; $("sm-logo").checked = st.logo;
    $("sm-photo-box").hidden = !LOOKS[st.look].photo;
    document.querySelectorAll("#sm-photos button").forEach(b => b.setAttribute("aria-pressed", st.photo && b.dataset.key === st.photo.key));
  }
  function usePreset(key) {
    const p = PRESETS[key];
    st.preset = key; st.look = p.look; st.head = p.head; st.sub = p.sub;
    if (p.size) st.size = p.size; else if (st.size === "cover") st.size = "square";
    if (p.photo) { const f = photoList().find(x => x.key === p.photo); if (f) { st.photo = f; resetPhotoPos(); } }
    setCaption();
    syncForm(); redraw();
  }
  function setCaption() {
    const p = PRESETS[st.preset];
    $("sm-caption").value = p.caption + (p.caption && $("sm-tags").checked ? "\n\n" + TAGS : "");
  }
  function drawPicker() {
    $("sm-photos").innerHTML = photoList().map(f =>
      `<button type="button" data-key="${esc(f.key)}" title="${esc(f.label)}" aria-label="${esc(f.label)}" aria-pressed="false"><img src="${esc(f.thumb)}" alt="" loading="lazy"></button>`).join("");
  }

  let wired = false;
  window.loadSocial = async function () {
    if (!wired) {
      wired = true;
      $("sm-preset").innerHTML = Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${esc(p.name)}</option>`).join("");
      $("sm-size").innerHTML = Object.entries(SIZES).map(([k, s]) => `<option value="${k}">${esc(s.name)}</option>`).join("");
      $("sm-look").innerHTML = Object.entries(LOOKS).map(([k, l]) => `<option value="${k}">${esc(l.name)}</option>`).join("");
      $("sm-preset").onchange = e => usePreset(e.target.value);
      $("sm-size").onchange = e => { st.size = e.target.value; redraw(); };
      $("sm-look").onchange = e => { st.look = e.target.value; syncForm(); redraw(); };
      $("sm-head").oninput = e => { st.head = e.target.value; redraw(); };
      $("sm-sub").oninput = e => { st.sub = e.target.value; redraw(); };
      $("sm-footer").onchange = e => { st.footer = e.target.checked; redraw(); };
      $("sm-logo").onchange = e => { st.logo = e.target.checked; redraw(); };
      for (const k of ["zoom", "px", "py"]) $("sm-" + k).oninput = e => { st[k] = +e.target.value; redraw(); };
      $("sm-photos").onclick = e => {
        const b = e.target.closest("button[data-key]");
        if (!b) return;
        st.photo = photoList().find(x => x.key === b.dataset.key); resetPhotoPos(); syncForm(); redraw();
      };
      $("sm-upload").onchange = e => {
        const file = e.target.files[0]; e.target.value = "";
        if (!file) return;
        st.photo = { key: "device", label: file.name, full: URL.createObjectURL(file) };
        resetPhotoPos(); syncForm(); redraw();
      };
      $("sm-tags").onchange = setCaption;
      $("sm-download").onclick = () => {
        if (!drawn) return;
        $("social-canvas").toBlob(blob => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `whimsical-pig-${st.preset}-${st.size}.png`;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          $("social-msg").textContent = "Saved to your Downloads. Now copy the caption and post it on Facebook.";
        }, "image/png");
      };
      $("sm-copy").onclick = async () => {
        const t = $("sm-caption");
        try { await navigator.clipboard.writeText(t.value); } catch (e) { t.select(); document.execCommand("copy"); }
        $("sm-copy").textContent = "Copied!"; setTimeout(() => { $("sm-copy").textContent = "Copy Caption"; }, 1600);
      };
      try { if (!site) await loadSite(); } catch (e) { /* the built-in photos still work */ }
      drawPicker();
      usePreset("piece");
      return;
    }
    redraw();
  };
})();
