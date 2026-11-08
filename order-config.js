// =====================================================================
//  THE WHIMSICAL PIG — "START AN ORDER" SETUP
//  Edit this file to change the order types, the example pieces shown
//  for each one, and the questions customers answer.
//
//  Order types are listed most-common first, based on the past year of
//  orders (military plaques & framing, then embroidery & apparel, then
//  plaques & engraving).
//
//  endpoint  optional email copy of each order. Paste a Formspree form URL
//            (https://formspree.io/f/xxxxxxx), see README. Orders are always
//            saved to the admin page (/admin → Order Requests) on the live site,
//            with their photos, and sent to shopVOX as a Sales Lead.
//  email     where orders go if the site can't save them (the customer's
//            email app opens with everything filled in)
//
//  Each order type has:
//    photo      a photo from images/work/ (name without -sm.webp)
//    examples   pictures of the most common versions. `photo` picks one from
//               images/work/; examples without one use `live` (a photo on the
//               current website) or a plain placeholder.
//    bring      a short "have these ready" checklist (also on the Help page)
//    itemsIn    true (or a showIf) when the customer brings us items; only then
//               does the contact step ask "Getting your items to us"
//    questions  the details we need. type can be:
//               text, textarea, number, date, select, radio, checks, note,
//               sizes (a box per size; total: "quantity" fills that question in),
//               dims (width × height in inches),
//               rankname (a rank list plus the name, e.g. "SFC John A. Smith")
//               proof: true        lists the answer under "Check the spelling" on
//                                  the review step (anything we engrave or print)
//               required: true     makes one mandatory
//               showIf: { q: "id", is: "answer" }   only asks when another
//                                  question has that answer (or is: ["a", "b"]
//                                  for any of several answers)
// =====================================================================

window.ORDER = {
  endpoint: "",
  email: "WhimsicalPig@hotmail.com",

  types: [
    {
      id: "military",
      itemsIn: true,          // asks "Getting your items to us" on the contact step
      title: "Military Framing",
      blurb: "Framed guidons & flags, snowshoes, plaques, slate awards & shadow boxes",
      photo: "military-shadow-boxes_09",
      examples: [
        { id: "framed-guidon-flag", title: "Framed Guidon or Flag", photo: "military-shadow-boxes_03", text: "Guidon or flag with rank, crest, coins & a plate" },
        { id: "snowshoe", title: "Snowshoe", photo: "military-shadow-boxes_17", text: "The 10th Mountain classic" },
        { id: "wooden-plaque", title: "Wooden Plaque", photo: "military-shadow-boxes_18", text: "Engraved plate on wood, with your items" },
        { id: "slate-award", title: "Slate Award", text: "Your image printed on slate" },
        { id: "shadow-box", title: "Shadow Box", photo: "military-shadow-boxes_08", text: "Flag, medals, ribbons, rank & photos" },
      ],
      bring: [
        "The date you need it (we prefer at least 2 weeks)",
        "Your company / unit, and Battalion Colors or Company Guidon",
        "Rank and name exactly as they should appear, and the plate wording",
        "Ranks, badges, crests, branch, patches, coins or photos to include",
        "Company-specific coins or patches: you'll need to supply these",
      ],
      questions: [
        { id: "unit", label: "What company or unit is this for?", type: "text", required: true,
          placeholder: "Start typing, e.g. 1-32 B Co", help: "Pick your unit from the list if it's there. This sets the mat colors." },
        { id: "recipient", label: "Who is it for? Rank and name as it should appear", type: "rankname", proof: true },
        { id: "position", label: "Position or callsign", type: "text", placeholder: "Optional, e.g. Company Commander, Hydra 6", proof: true },
        { id: "dates", label: "Dates of service", type: "text", placeholder: "e.g. October 2023 – June 2026" },
        { id: "inscription", label: "Plate wording / dedication", type: "textarea", proof: true,
          placeholder: "e.g. From the Officers, NCOs and Soldiers of B Company. Thank you for your leadership." },
        { id: "flag_kind", label: "Are you looking for the Battalion Colors or a Company Guidon?", type: "radio", required: true,
          options: ["Battalion Colors", "Company Guidon", "Neither", "Not sure"],
          help: "Battalion Colors are usually the eagle or the large rectangular flag on display at command. Company Guidons are the swallowtail flags." },
        { id: "guidon_kind", label: "Which kind of company?", type: "radio", showIf: { q: "flag_kind", is: "Company Guidon" },
          options: ["Company of a Battalion (e.g. 4-31/B INF)", "Separate Company, not part of a Battalion (e.g. 152 ENG)",
                    "Letter Company of a Separate Company (e.g. 152/A ENG)", "Not sure"] },
        { id: "guidon_text", label: "Unit designation exactly as it goes on the guidon", type: "text", proof: true,
          placeholder: "e.g. 4-31/B INF", showIf: { q: "flag_kind", is: "Company Guidon" } },
        { id: "guidon_size", label: "What size guidon?", type: "select", showIf: { q: "flag_kind", is: ["Battalion Colors", "Company Guidon"] },
          options: ["Regulation (20 × 28 in)", "Non-regulation 5 × 7 in", "Non-regulation 8 × 11 in", "Non-regulation 10 × 14 in",
                    "Non-regulation 13 × 17 in", "Non-regulation 15 × 20 in", "Not sure"] },
        { id: "items", label: "What items do you want to include?", type: "checks",
          options: ["Ranks", "Badges", "Crests", "Branch", "Patches", "Coins", "Photos", "Ribbons / medals", "Folded flag", "Other"] },
        { id: "items_note", type: "note", showIf: { q: "items", is: ["Patches", "Coins"] },
          text: "Company-specific coins or patches come from your unit and aren't available from our suppliers, so you'll need to supply those." },
        { id: "items_source", label: "Where are the items coming from?", type: "radio", showIf: { q: "items", is: ["Ranks", "Badges", "Crests", "Branch", "Patches", "Coins", "Photos", "Ribbons / medals", "Folded flag", "Other"] },
          options: ["I'll bring or ship them", "Please get the ranks / crests for us", "A mix of both"] },
        { id: "frame", label: "Mat and frame colors", type: "text", placeholder: "Optional, e.g. black mat over gray, black frame" },
        { id: "repeat", label: "Repeat order", type: "checks", options: ["This matches a piece you've made before"] },
        { id: "reorder", label: "Order # or name on the earlier piece", type: "text", placeholder: "If you have it", showIf: { q: "repeat", is: "This matches a piece you've made before" } },
      ],
    },
    {
      id: "apparel",
      itemsIn: { q: "garments_from", is: "I'll provide the garments" },
      title: "Embroidery & Apparel",
      blurb: "Shirts, polos, hats, hoodies, scrubs, bags & more",
      photo: "embroidery_07",
      examples: [
        { id: "unit-shirts", title: "Unit & Team Shirts", photo: "apparel-printing_02", text: "Matching shirts for the whole group" },
        { id: "embroidered-polos-hats", title: "Embroidered Polos & Hats", photo: "embroidery_06", text: "Your logo on the chest or hat front" },
        { id: "custom-printing", title: "Custom Printing", photo: "apparel-printing_05", text: "Your design, printed" },
        { id: "custom-patches", title: "Custom Patches", photo: "patches_02", text: "Embroidered patches for units, clubs & teams" },
      ],
      bring: [
        "Your logo (PDF, AI, EPS, SVG or a clear photo) or the exact words",
        "Garment types, colors, sizes and how many of each",
        "Your garments, if you're providing them",
      ],
      questions: [
        { id: "fee_note", type: "note",
          text: "First time with a logo? There's a one-time $45 digitizing fee, plus a price based on how many stitches it is. Once we have your logo on file, it's just based on the stitch count." },
        { id: "garments_from", label: "Will you be providing the garments, or should we?", type: "radio", required: true,
          options: ["I'll provide the garments", "Please provide the garments"] },
        { id: "garment", label: "What items?", type: "text", required: true, placeholder: "e.g. black polos, navy hats, grey hoodies" },
        { id: "garment_colors", label: "Garment colors", type: "text", placeholder: "e.g. black, heather grey",
          showIf: { q: "garments_from", is: "Please provide the garments" } },
        { id: "sizes", label: "How many of each size?", type: "sizes", total: "quantity",
          help: "Leave a size blank if you don't need it. The total fills in the quantity." },
        { id: "quantity", label: "Total quantity", type: "number", required: true, min: 1 },
        { id: "logo_status", label: "Your logo", type: "radio", required: true,
          options: ["New logo (I'll upload it next)", "You have it on file", "No logo, just words"] },
        { id: "logo_text", label: "Words you'd like", type: "textarea", proof: true, showIf: { q: "logo_status", is: "No logo, just words" },
          placeholder: "Exactly as it should read" },
        { id: "placement", label: "Placement", type: "checks",
          options: ["Left chest", "Full front", "Back", "Sleeve", "Hat front"] },
        { id: "method", label: "Decoration", type: "radio",
          options: ["Embroidery", "Vinyl", "Printing", "Not sure — recommend one"] },
      ],
    },
    {
      id: "award",
      title: "Plaques & Engraving",
      blurb: "Engraved plates, award plaques, league & race awards",
      photo: "military-shadow-boxes_18",
      examples: [
        { id: "engraved-plates", title: "Engraved Plates", text: "Name plates and data plates" },
        { id: "award-plaque", title: "Award Plaque", text: "Appreciation, retirement & recognition" },
        { id: "league-awards", title: "League & Race Awards", text: "A set for your event or season" },
      ],
      bring: [
        "The exact wording for each plate or award",
        "Your logo file, if it goes on the piece",
        "How many you need and the date",
      ],
      questions: [
        { id: "occasion", label: "What's it for?", type: "text", required: true, placeholder: "e.g. golf league, retirement, appreciation" },
        { id: "quantity", label: "How many?", type: "number", required: true, min: 1 },
        { id: "size", label: "Plate or plaque size", type: "text", placeholder: "Optional, e.g. 4 1/8 × 1 1/4 in" },
        { id: "engraving", label: "Engraving text", type: "textarea", proof: true, placeholder: "Exactly as you want it to read. One block per plate if they differ." },
        { id: "logo", label: "Logo or artwork?", type: "radio", options: ["Yes (uploading next)", "No"] },
        { id: "repeat", label: "Repeat order", type: "checks", options: ["This matches an order you've made before"] },
        { id: "reorder", label: "Order # from the earlier order", type: "text", placeholder: "If you have it", showIf: { q: "repeat", is: "This matches an order you've made before" } },
      ],
    },
    {
      id: "guidon",
      title: "Guidons",
      blurb: "Regulation & non-regulation guidons",
      photo: "military-shadow-boxes_13",
      examples: [
        { id: "regulation-guidon", title: "Regulation Guidon", photo: "military-shadow-boxes_13", text: "Made to regulation spec" },
        { id: "non-regulation-guidon", title: "Non-Regulation Guidon", photo: "military-shadow-boxes_09", text: "Your custom design & colors" },
      ],
      bring: [
        "Unit designation spelled exactly as it should appear",
        "A photo of your current guidon or your artwork",
        "Colors, quantity and the date you need them",
      ],
      questions: [
        { id: "unit", label: "Unit designation exactly as it goes on the guidon", type: "text", required: true, proof: true, placeholder: "e.g. 4-31/B INF" },
        { id: "quantity", label: "How many?", type: "number", required: true, min: 1 },
        { id: "guidon_kind", label: "Which kind of company?", type: "radio",
          options: ["Company of a Battalion (e.g. 4-31/B INF)", "Separate Company, not part of a Battalion (e.g. 152 ENG)",
                    "Letter Company of a Separate Company (e.g. 152/A ENG)", "Not a company guidon"] },
        { id: "size", label: "What size?", type: "select",
          options: ["Regulation (20 × 28 in)", "Non-regulation 5 × 7 in", "Non-regulation 8 × 11 in", "Non-regulation 10 × 14 in",
                    "Non-regulation 13 × 17 in", "Non-regulation 15 × 20 in", "Not sure"] },
        { id: "colors", label: "Guidon colors", type: "text", required: true, placeholder: "e.g. red with white lettering" },
        { id: "design", label: "Symbols, lettering or design notes", type: "textarea", placeholder: "Upload a photo or artwork in the next step if you have it" },
        { id: "framed", label: "Framed for display?", type: "radio", options: ["Just the guidon", "Framed with a dedication plate"] },
      ],
    },
    {
      id: "framing",
      itemsIn: true,
      title: "Custom Framing",
      blurb: "Art, photos, jerseys, diplomas & keepsakes",
      photo: "art-framing_06",
      examples: [
        { id: "art-print", title: "Art or Photo", photo: "art-framing_03", text: "Matted & framed" },
        { id: "jersey", title: "Jersey or Shirt", photo: "sports-memorabilia_03", text: "Framed in a deep case" },
        { id: "diploma-certificate", title: "Diploma or Certificate", text: "Clean & classic" },
      ],
      bring: [
        "The piece you want framed",
        "Its measurements, if you are mailing it",
        "Photos of frames or rooms you like, for ideas",
      ],
      questions: [
        { id: "piece", label: "What are we framing?", type: "text", required: true },
        { id: "size", label: "Size of the piece", type: "dims", help: "Measure the art or item itself. Leave blank if you're not sure." },
        { id: "glass", label: "Glass", type: "select", options: ["Help me choose", "Regular", "UV protective", "Non-glare"] },
        { id: "mat", label: "Mat", type: "select", options: ["Help me choose", "Single mat", "Double mat", "No mat"] },
        { id: "style", label: "Frame style or colors you like", type: "textarea", placeholder: "Optional" },
      ],
    },
    {
      id: "design",
      title: "Logo & Graphic Design",
      blurb: "Logos, shirt designs, event graphics & layouts",
      photo: "apparel-printing_05",
      examples: [
        { id: "logo", title: "Logo", photo: "embroidery_06", text: "For a business, club or team" },
        { id: "apparel-design", title: "Shirt & Apparel Design", photo: "apparel-printing_05", text: "Artwork for shirts, hoodies & hats" },
        { id: "event-design", title: "Event Design", photo: "apparel-printing_01", text: "For a festival, race or fundraiser" },
      ],
      bring: [
        "Your business, team or event name exactly as it should read",
        "Any current logo, sketch or examples you like",
        "Colors, and where the design will be used",
      ],
      questions: [
        { id: "design_what", label: "What do you need designed?", type: "checks", required: true,
          options: ["Logo", "Shirt / apparel design", "Event or festival design", "Unit / company design", "Sign or print", "Other"] },
        { id: "design_name", label: "Business, team or event name", type: "text", required: true },
        { id: "design_about", label: "Tell us about it", type: "textarea",
          placeholder: "What you do, who it's for, and the feel you want (fun, classic, bold...)" },
        { id: "design_logo", label: "Do you have a logo now?", type: "radio",
          options: ["Yes, use it in the design", "Yes, but refresh it", "No, start fresh"] },
        { id: "design_colors", label: "Colors", type: "text", placeholder: "e.g. navy and gold, or \"help me choose\"" },
        { id: "design_use", label: "Where will it be used?", type: "checks",
          options: ["Shirts & apparel", "Embroidery", "Signs", "Website & social media", "Plaques & engraving", "Print"] },
        { id: "design_likes", label: "Designs or styles you like", type: "textarea",
          placeholder: "Describe them, and upload examples in the photos step" },
      ],
    },
    {
      id: "partner",
      title: "Merch Partnership",
      blurb: "Year-round merch for your business or event, 10% off for partners",
      photo: "shop_02",
      examples: [
        { id: "business-merch", title: "Business Merch", photo: "embroidery_03", text: "Shirts & hats with your logo, all year" },
        { id: "event-merch", title: "Event & Festival Merch", photo: "apparel-printing_01", text: "Designs for every event, every year" },
        { id: "team-merch", title: "Team & Club Merch", photo: "apparel-printing_02", text: "Gear for players, families & fans" },
      ],
      bring: [
        "Your business or event name, and event dates",
        "Your logo, if you have one",
        "The kinds of merch you'd like and rough quantities",
      ],
      questions: [
        { id: "partner_note", type: "note",
          text: "Merch partners get exclusive, year-round merch from us: we design it (no design fee with a signed agreement), you approve every design, and you get 10% off every order of your merch. We'll send you the partner agreement to look over." },
        { id: "partner_type", label: "What kind of partner are you?", type: "radio", required: true,
          options: ["Business", "Event / festival", "Team / club", "School", "Other"] },
        { id: "partner_name", label: "Business or event name", type: "text", required: true },
        { id: "partner_dates", label: "Event dates", type: "text", showIf: { q: "partner_type", is: "Event / festival" }, placeholder: "e.g. every July, 3rd weekend" },
        { id: "partner_items", label: "What merch are you interested in?", type: "checks",
          options: ["T-shirts", "Sweatpants", "Hoodies / sweatshirts", "Hats", "Bags", "Patches", "Other"] },
        { id: "partner_qty", label: "About how many items a year?", type: "radio",
          options: ["Under 50", "50 – 150", "150 – 500", "500+", "Not sure yet"] },
        { id: "partner_sell", label: "Where will it be sold?", type: "checks",
          options: ["At our business / event", "Online", "Through The Whimsical Pig", "Not sure yet"] },
        { id: "partner_logo", label: "Do you have a logo?", type: "radio", required: true,
          options: ["Yes, we have a logo", "No, design one for us"] },
      ],
    },
    {
      id: "other",
      itemsIn: true,
      title: "Something Else",
      blurb: "Gifts, slate, tumblers, prints & ideas",
      photo: "shop_04",
      examples: [],
      bring: ["Photos or examples of what you have in mind"],
      questions: [
        { id: "idea", label: "Tell us what you have in mind", type: "textarea", required: true },
        { id: "quantity", label: "How many?", type: "number", min: 1 },
      ],
    },
  ],
};
