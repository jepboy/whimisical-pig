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
//            saved to the admin page (/admin → Order Requests) on the live site.
//  email     where orders go if the site can't save them (the customer's
//            email app opens with everything filled in)
//
//  Each order type has:
//    examples   pictures of the most common versions. Put photos in
//               images/examples/ named after the example id
//               (e.g. images/examples/farewell-plaque.jpg) and list them in
//               settings.js → localPhotos as "examples/farewell-plaque.jpg".
//    bring      a short "have these ready" checklist (also on the Help page)
//    questions  the details we need. type can be:
//               text, textarea, number, date, select, radio, checks, note
//               required: true     makes one mandatory
//               showIf: { q: "id", is: "answer" }   only asks when another
//                                  question has that answer
// =====================================================================

window.ORDER = {
  endpoint: "",
  email: "WhimsicalPig@hotmail.com",

  types: [
    {
      id: "military",
      title: "Military Framing",
      blurb: "Farewell, retirement & promotion plaques, shadow boxes and guidon displays",
      live: "button%203.jpg",
      examples: [
        { id: "farewell-plaque", title: "Farewell / Leadership Plaque", live: "button%203.jpg", text: "Rank, unit crest, coins & an engraved plate" },
        { id: "retirement-shadow-box", title: "Retirement Shadow Box", live: "button%202.jpg", text: "Flag, medals, ribbons, rank & photos" },
        { id: "guidon-display", title: "Framed Guidon Display", live: "button%201.jpg", text: "Your guidon with a dedication plate" },
      ],
      bring: [
        "Rank and name exactly as they should appear",
        "The unit / company, and dates in the position",
        "The plate wording or dedication",
        "Coins, patches, pins, rank, crest, ribbons or other items to include",
        "Your unit's logo or a photo of the guidon, if you want it in the background",
      ],
      questions: [
        { id: "unit", label: "What company / unit are you with?", type: "text", required: true, placeholder: "e.g. B Co, 2-14 IN, 10th Mountain Division" },
        { id: "recipient", label: "Who is it for? Rank and name as it should appear", type: "text", required: true, placeholder: "e.g. SFC John A. Smith" },
        { id: "position", label: "Position or callsign", type: "text", placeholder: "Optional, e.g. Company Commander, Hydra 6" },
        { id: "dates", label: "Dates of service", type: "text", placeholder: "e.g. October 2023 – June 2026" },
        { id: "inscription", label: "Plate wording / dedication", type: "textarea",
          placeholder: "e.g. From the Officers, NCOs and Soldiers of B Company. Thank you for your leadership." },
        { id: "items", label: "What items do you want to include?", type: "checks",
          options: ["Rank", "Unit crest", "Coins", "Patches", "Pins", "Ribbons / medals", "Wings / badges", "Folded flag", "Photos", "Other"] },
        { id: "items_source", label: "Where are the items coming from?", type: "radio",
          options: ["I'll bring or ship them", "Please get the rank / crest for us", "A mix of both"] },
        { id: "colors", label: "What guidon or battalion colors would you like to include?", type: "text", required: true,
          placeholder: "e.g. infantry blue background, red and white guidon colors" },
        { id: "frame", label: "Mat and frame colors", type: "text", placeholder: "Optional, e.g. black mat over gray, black frame" },
        { id: "reorder", label: "Same as a past order?", type: "text", placeholder: "Order # or name on the earlier piece (optional)" },
      ],
    },
    {
      id: "apparel",
      title: "Embroidery & Apparel",
      blurb: "Shirts, polos, hats, hoodies, scrubs, bags & more",
      live: "52565901_10161418329605076_7165628496394321920_o.jpg",
      examples: [
        { id: "unit-shirts", title: "Unit & Team Shirts", live: "button%2006.png", text: "Matching shirts for the whole group" },
        { id: "embroidered-polos-hats", title: "Embroidered Polos & Hats", live: "52565901_10161418329605076_7165628496394321920_o.jpg", text: "Your logo on the chest or hat front" },
        { id: "custom-printing", title: "Custom Printing", live: "fb_img_1576654875481.jpg", text: "Your design, printed" },
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
        { id: "quantity", label: "Total quantity", type: "number", required: true, min: 1 },
        { id: "sizes", label: "Sizes & how many of each", type: "textarea", placeholder: "e.g. S ×4, M ×10, L ×8, XL ×3" },
        { id: "logo_status", label: "Have we done this logo for you before?", type: "radio", required: true,
          options: ["No, it's a new logo", "Yes, you have it on file"] },
        { id: "logo_text", label: "Words you'd like (if there's no logo)", type: "textarea",
          placeholder: "Exactly as it should read. Upload a photo of your logo in the next step." },
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
      live: "button%2018.jpg",
      examples: [
        { id: "engraved-plates", title: "Engraved Plates", live: "button%2019.jpg", text: "Name plates and data plates" },
        { id: "award-plaque", title: "Award Plaque", live: "button%2018.jpg", text: "Appreciation, retirement & recognition" },
        { id: "league-awards", title: "League & Race Awards", live: "button%2018.jpg", text: "A set for your event or season" },
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
        { id: "engraving", label: "Engraving text", type: "textarea", placeholder: "Exactly as you want it to read. One block per plate if they differ." },
        { id: "logo", label: "Logo or artwork?", type: "radio", options: ["Yes (uploading next)", "No"] },
        { id: "reorder", label: "Same as a past order?", type: "text", placeholder: "Order # (optional)" },
      ],
    },
    {
      id: "guidon",
      title: "Guidons",
      blurb: "Regulation & non-regulation guidons",
      live: "button%205.jpg",
      examples: [
        { id: "regulation-guidon", title: "Regulation Guidon", live: "button%205.jpg", text: "Made to regulation spec" },
        { id: "non-regulation-guidon", title: "Non-Regulation Guidon", live: "button%2020.jpg", text: "Your custom design & colors" },
      ],
      bring: [
        "Unit designation spelled exactly as it should appear",
        "A photo of your current guidon or your artwork",
        "Colors, quantity and the date you need them",
      ],
      questions: [
        { id: "unit", label: "What company / unit are you with?", type: "text", required: true, placeholder: "e.g. B Co, 2-14 IN" },
        { id: "quantity", label: "How many?", type: "number", required: true, min: 1 },
        { id: "colors", label: "Guidon colors", type: "text", required: true, placeholder: "e.g. red with white lettering" },
        { id: "design", label: "Symbols, lettering or design notes", type: "textarea", placeholder: "Upload a photo or artwork in the next step if you have it" },
        { id: "framed", label: "Framed for display?", type: "radio", options: ["Just the guidon", "Framed with a dedication plate"] },
      ],
    },
    {
      id: "framing",
      title: "Custom Framing",
      blurb: "Art, photos, jerseys, diplomas & keepsakes",
      live: "button%204.jpg",
      examples: [
        { id: "art-print", title: "Art or Photo", text: "Matted & framed" },
        { id: "jersey", title: "Jersey or Shirt", text: "Framed in a deep case" },
        { id: "diploma-certificate", title: "Diploma or Certificate", text: "Clean & classic" },
      ],
      bring: [
        "The piece you want framed",
        "Its measurements, if you are mailing it",
        "Photos of frames or rooms you like, for ideas",
      ],
      questions: [
        { id: "piece", label: "What are we framing?", type: "text", required: true },
        { id: "size", label: "Size (width × height)", type: "text", placeholder: "e.g. 16 × 20 in" },
        { id: "glass", label: "Glass", type: "select", options: ["Help me choose", "Regular", "UV protective", "Non-glare"] },
        { id: "mat", label: "Mat", type: "select", options: ["Help me choose", "Single mat", "Double mat", "No mat"] },
        { id: "style", label: "Frame style or colors you like", type: "textarea", placeholder: "Optional" },
      ],
    },
    {
      id: "other",
      title: "Something Else",
      blurb: "Gifts, slate, tumblers, prints & ideas",
      live: "button%207.jpg",
      examples: [],
      bring: ["Photos or examples of what you have in mind"],
      questions: [
        { id: "idea", label: "Tell us what you have in mind", type: "textarea", required: true },
        { id: "quantity", label: "How many?", type: "number", min: 1 },
      ],
    },
  ],
};
