// Which shopVOX products go on a sales order made from a website order.
//
// Customers never see these: they answer the normal order questions, and this
// file turns their answers into suggested line items on the shopVOX sales order.
// Kat checks them, changes anything, and sets the final prices in shopVOX.
//
// Product names must match shopVOX exactly (Settings → Products). Items marked
// `check: "..."` are best guesses; the note shows on the line item in shopVOX.
// Product list from the shopVOX export of 2026-11-12.

// Guidon sizes as the order form words them -> the size in shopVOX product names
const GUIDON_SIZES = {
  "Regulation (20 × 28 in)": "20x28",
  "Non-regulation 5 × 7 in": "5x7",
  "Non-regulation 8 × 11 in": "8x11",
  "Non-regulation 10 × 14 in": "10x14",
  "Non-regulation 13 × 17 in": "13x17",
  "Non-regulation 15 × 20 in": "15x21",
};
// A finished guidon on its own (the Guidons order type)
const GUIDON_FINISHED = {
  "5x7": "5x7 Guidon, single-sided, finished",
  "8x11": "8x11 Guidon, single-sided, finished",
  "10x14": "10x14 Guidon, single-sided, finished",
  "13x17": "13x17 Guidon, single-sided, finished",
  "15x21": "15x21 Guidon, single-sided, finished",
  "20x28": "20x28 Guidon, single-sided, finished",
};
// An unfinished guidon, for framing
const GUIDON_UNFINISHED = {
  "5x7": "5x7 Guidon, unfinished",
  "8x11": "8x11 Guidon, single-sided, unfinished",
  "10x14": "10x14 Guidon, single-sided, unfinished",
  "13x17": "13x17 Guidon, single-sided, unfinished",
  "15x21": "15x21 Guidon, single-sided, unfinished",
  "20x28": "20x28 Guidon, single-sided, unfinished (stretched opening)",
};
// The frame package for a framed guidon of each size (best guesses: Kat to confirm)
const GUIDON_FRAME = {
  "5x7": "11x14 Military Framing Package",
  "8x11": "14x18 Military Framing Package",
  "10x14": "16x20 Military Framing Package",
  "13x17": "20x24 Military Framing Package",
  "15x21": "22x28 Military Framing Package",
  "20x28": "30x36 Military Framing Package",
};
const SNOWSHOES = {
  "Mini (5 × 15 in)": "Mini Snowshoe (5\"x15\")",
  "Medium (9 × 29 in)": "Medium Snowshoe (9\"x29\")",
  "Large (11 × 36 in)": "Large Snowshoe (11\"x36\")",
  "X-Large (12 × 42 in)": "X-Large Snowshoe (12\"x42\")",
};
const RUSH_DAYS = 14;   // needed sooner than this: suggest the Rush Fee

// answers: { type, example, q: { questionId: [values] } }, plus the order's needed-by date
export function suggestItems(answers, neededBy, today) {
  const a = answers && typeof answers === "object" ? answers : {};
  const q = a.q && typeof a.q === "object" ? a.q : {};
  const one = id => String((q[id] || [])[0] || "");
  const qty = Math.min(10000, Math.max(1, parseInt(one("quantity"), 10) || 1));
  const ex = String(a.example || "");
  const out = [];
  const add = (product, quantity = 1, check = "") => out.push({ product, quantity, check });

  switch (a.type) {
    case "military": {
      if (ex === "Snowshoe") {
        const s = SNOWSHOES[one("snowshoe_size")];
        if (s) add(s); else add(SNOWSHOES["Medium (9 × 29 in)"], 1, "Size not given: check the snowshoe size.");
      }
      if (ex === "Shadow Box") add("Custom Shadowbox Framing");
      if (ex === "Wooden Plaque") add("Custom Plaque");
      if (one("flag_kind") === "Company Guidon" && ex !== "Snowshoe") {
        const size = GUIDON_SIZES[one("guidon_size")];
        if (size) {
          add(GUIDON_UNFINISHED[size]);
          add(GUIDON_FRAME[size], 1, `Frame package picked for the ${size} guidon: check the size.`);
        }
      }
      break;
    }
    case "guidon": {
      const size = GUIDON_SIZES[one("size")];
      if (size) {
        if (one("framed") === "Framed with a dedication plate") {
          add(GUIDON_UNFINISHED[size], qty);
          add(GUIDON_FRAME[size], qty, `Frame package picked for the ${size} guidon: check the size.`);
        } else add(GUIDON_FINISHED[size], qty, "Single-sided picked: change to double-sided if needed.");
      }
      break;
    }
    case "framing":
      if (ex === "Jersey or Shirt") add("Custom Shadowbox Framing");
      else if (ex === "Art or Photo" || ex === "Diploma or Certificate") add("Custom Framing");
      break;
    case "award":
      if (ex === "Engraved Plates") add("Engraved Name Plates", qty);
      if (ex === "Award Plaque") add("Custom Plaque", qty);
      if (ex === "League & Race Awards") add("Trophies", qty);
      break;
    case "apparel": {
      const m = one("method") || (ex === "Embroidered Polos & Hats" ? "Embroidery" : "");
      if (m === "Embroidery") {
        add("2024 Embroidery - Apparel (by grid)", qty);
        if (one("logo_status").startsWith("New logo")) add("Digitizing");
      }
      if (m === "Printing") add("Screen Printing - Apparel (by grid)", qty);
      if (m === "Vinyl") add("Apparel Decoration - Heat Transfers (by color count)", qty);
      break;
    }
    case "design":
      add("Graphics Labor", 1, "Set the hours.");
      break;
  }
  // Needed soon: suggest the rush fee
  if (/^\d{4}-\d{2}-\d{2}$/.test(neededBy || "") && today) {
    const days = Math.round((Date.parse(neededBy) - Date.parse(today)) / 86400000);
    if (days >= 0 && days < RUSH_DAYS) add("Rush Fee", 1, `Needed in ${days} day${days === 1 ? "" : "s"}: charge a rush fee?`);
  }
  return out.filter(i => i.product);
}
