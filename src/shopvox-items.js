// Which shopVOX products go on a sales order made from a website order.
//
// Customers never see these: they answer the normal order questions, and these
// matches turn their answers into suggested line items (listed on the sales lead,
// added to the sales order). Kat changes them on the admin page (shopVOX Items);
// what's below is only the starting point. A blank product adds nothing.
// A note shows on that line item in shopVOX (use it for "check this").
// Product list from the shopVOX export of 2026-11-12.

const SIZES = [["5x7", "5 × 7"], ["8x11", "8 × 11"], ["10x14", "10 × 14"], ["13x17", "13 × 17"], ["15x21", "15 × 20/21"], ["20x28", "20 × 28 (regulation)"]];
const UNFINISHED = { "5x7": "5x7 Guidon, unfinished", "20x28": "20x28 Guidon, single-sided, unfinished (stretched opening)" };
const FRAME = { "5x7": "11x14", "8x11": "14x18", "10x14": "16x20", "13x17": "20x24", "15x21": "22x28", "20x28": "30x36" };

// Groups of matches, as the admin page shows them: [key, "when the customer…", default product, default note]
export const ITEM_GROUPS = [
  { title: "Snowshoes", hint: "Military Framing → Snowshoe, by the size they pick", slots: [
    ["snow_mini", "Mini (5 × 15 in)", "Mini Snowshoe (5\"x15\")", ""],
    ["snow_medium", "Medium (9 × 29 in)", "Medium Snowshoe (9\"x29\")", ""],
    ["snow_large", "Large (11 × 36 in)", "Large Snowshoe (11\"x36\")", ""],
    ["snow_xl", "X-Large (12 × 42 in)", "X-Large Snowshoe (12\"x42\")", ""],
    ["snow_unsure", "Size not picked", "Medium Snowshoe (9\"x29\")", "Size not given: check the snowshoe size."],
    ["snow_extra", "Also add with every snowshoe", "", ""],
  ] },
  { title: "Military Framing", hint: "By the starting point they pick, or Battalion Colors", slots: [
    ["mil_shadow", "Shadow Box", "Custom Shadowbox Framing", ""],
    ["mil_plaque", "Wooden Plaque", "Custom Plaque", ""],
    ["mil_slate", "Slate Award", "", ""],
    ["mil_bn_package", "Battalion Colors: the framing package", "", ""],
    ["mil_bn_color", "Battalion Colors: the colors", "", ""],
  ] },
  { title: "Framed guidons", hint: "Military Framing → Company Guidon, or Guidons → framed with a plate, by guidon size", slots: SIZES.flatMap(([k, label]) => [
    [`gu_${k}`, `${label} guidon: the guidon`, UNFINISHED[k] || `${k} Guidon, single-sided, unfinished`, ""],
    [`gf_${k}`, `${label} guidon: the frame package`, `${FRAME[k]} Military Framing Package`, `Frame package picked for the ${k} guidon: check the size.`],
  ]) },
  { title: "Guidons on their own", hint: "Guidons → just the guidon, by size (times the quantity)", slots: SIZES.map(([k, label]) =>
    [`gn_${k}`, `${label} guidon`, `${k} Guidon, single-sided, finished`, "Single-sided picked: change to double-sided if needed."]) },
  { title: "Custom Framing", hint: "By the starting point they pick", slots: [
    ["fr_art", "Art or Photo", "Custom Framing", ""],
    ["fr_diploma", "Diploma or Certificate", "Custom Framing", ""],
    ["fr_jersey", "Jersey or Shirt", "Custom Shadowbox Framing", ""],
  ] },
  { title: "Plaques & Engraving", hint: "By the starting point (times the quantity)", slots: [
    ["aw_plates", "Engraved Plates", "Engraved Name Plates", ""],
    ["aw_plaque", "Award Plaque", "Custom Plaque", ""],
    ["aw_league", "League & Race Awards", "Trophies", ""],
  ] },
  { title: "Embroidery & Apparel", hint: "By the decoration they pick (times the quantity)", slots: [
    ["ap_embroidery", "Embroidery", "2024 Embroidery - Apparel (by grid)", ""],
    ["ap_printing", "Printing", "Screen Printing - Apparel (by grid)", ""],
    ["ap_vinyl", "Vinyl", "Apparel Decoration - Heat Transfers (by color count)", ""],
    ["ap_digitizing", "Embroidery with a new logo: also add", "Digitizing", ""],
    ["ap_patches", "Custom Patches", "", ""],
  ] },
  { title: "Design & other", hint: "", slots: [
    ["de_design", "Logo & Design orders", "Graphics Labor", "Set the hours."],
    ["rush", "Needed in under 2 weeks", "Rush Fee", "Needed in {days} days: charge a rush fee?"],
  ] },
];
export const ITEM_DEFAULTS = Object.fromEntries(ITEM_GROUPS.flatMap(g => g.slots.map(([k, , product, note]) => [k, { product, note }])));

const GUIDON_SIZES = {
  "Regulation (20 × 28 in)": "20x28", "Non-regulation 5 × 7 in": "5x7", "Non-regulation 8 × 11 in": "8x11",
  "Non-regulation 10 × 14 in": "10x14", "Non-regulation 13 × 17 in": "13x17", "Non-regulation 15 × 20 in": "15x21",
};
const SNOW_SIZES = { "Mini (5 × 15 in)": "snow_mini", "Medium (9 × 29 in)": "snow_medium", "Large (11 × 36 in)": "snow_large", "X-Large (12 × 42 in)": "snow_xl" };
const RUSH_DAYS = 14;

// answers: { type, example, q: { questionId: [values] } }; slots: Kat's matches (missing ones use the defaults)
export function suggestItems(answers, neededBy, today, slots = {}) {
  const a = answers && typeof answers === "object" ? answers : {};
  const q = a.q && typeof a.q === "object" ? a.q : {};
  const one = id => String((q[id] || [])[0] || "");
  const qty = Math.min(10000, Math.max(1, parseInt(one("quantity"), 10) || 1));
  const ex = String(a.example || "");
  const out = [];
  const add = (key, quantity = 1, vars = {}) => {
    const s = { ...ITEM_DEFAULTS[key], ...(slots[key] || {}) };
    if (s.product) out.push({ product: s.product, quantity, check: String(s.note || "").replace(/\{(\w+)\}/g, (m, v) => vars[v] ?? m) });
  };
  const framedGuidon = (size, n) => { add(`gu_${size}`, n); add(`gf_${size}`, n); };

  switch (a.type) {
    case "military": {
      if (ex === "Snowshoe") { add(SNOW_SIZES[one("snowshoe_size")] || "snow_unsure"); add("snow_extra"); }
      if (ex === "Shadow Box") add("mil_shadow");
      if (ex === "Wooden Plaque") add("mil_plaque");
      if (ex === "Slate Award") add("mil_slate");
      if (ex !== "Snowshoe") {
        if (one("flag_kind") === "Battalion Colors") { add("mil_bn_package"); add("mil_bn_color"); }
        const size = GUIDON_SIZES[one("guidon_size")];
        if (one("flag_kind") === "Company Guidon" && size) framedGuidon(size, 1);
      }
      break;
    }
    case "guidon": {
      const size = GUIDON_SIZES[one("size")];
      if (size) one("framed") === "Framed with a dedication plate" ? framedGuidon(size, qty) : add(`gn_${size}`, qty);
      break;
    }
    case "framing":
      if (ex === "Art or Photo") add("fr_art");
      if (ex === "Diploma or Certificate") add("fr_diploma");
      if (ex === "Jersey or Shirt") add("fr_jersey");
      break;
    case "award":
      if (ex === "Engraved Plates") add("aw_plates", qty);
      if (ex === "Award Plaque") add("aw_plaque", qty);
      if (ex === "League & Race Awards") add("aw_league", qty);
      break;
    case "apparel": {
      if (ex === "Custom Patches") add("ap_patches", qty);
      const m = one("method") || (ex === "Embroidered Polos & Hats" ? "Embroidery" : "");
      if (m === "Embroidery") { add("ap_embroidery", qty); if (one("logo_status").startsWith("New logo")) add("ap_digitizing"); }
      if (m === "Printing") add("ap_printing", qty);
      if (m === "Vinyl") add("ap_vinyl", qty);
      break;
    }
    case "design":
      add("de_design");
      break;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(neededBy || "") && today) {
    const days = Math.round((Date.parse(neededBy) - Date.parse(today)) / 86400000);
    if (days >= 0 && days < RUSH_DAYS) add("rush", 1, { days });
  }
  return out;
}
