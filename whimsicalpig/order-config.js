// =====================================================================
//  THE WHIMSICAL PIG — "START AN ORDER" SETUP
//  Edit this file to change the order types, the example pieces shown
//  for each one, and the questions customers answer.
//
//  endpoint  where finished orders are sent. Paste a Formspree form URL
//            (https://formspree.io/f/xxxxxxx), see README. If left "",
//            the customer's email app opens with everything filled in.
//  email     where orders go when there is no endpoint
//
//  Each order type has:
//    examples   pictures of the most common versions. Put photos in
//               images/examples/ named after the example id
//               (e.g. images/examples/classic-retirement.jpg).
//    questions  the details we need. type can be:
//               text, textarea, number, date, select, radio, checks
//               add  required: true  to make one mandatory
// =====================================================================

window.ORDER = {
  endpoint: "",
  email: "WhimsicalPig@hotmail.com",

  types: [
    {
      id: "shadow-box",
      title: "Military Shadow Box",
      blurb: "Retirement, promotion, farewell & memorial",
      live: "button%202.jpg",
      examples: [
        { id: "classic-retirement", title: "Classic Retirement", text: "Folded flag, medals, rank & nameplate" },
        { id: "full-career", title: "Full Career", text: "Flag, medals, patches, coins & photos" },
        { id: "medals-ribbons", title: "Medals & Ribbons", text: "A clean display of awards" },
      ],
      questions: [
        { id: "member_name", label: "Name as it should appear", type: "text", required: true, placeholder: "e.g. SFC John A. Smith" },
        { id: "rank", label: "Rank", type: "text" },
        { id: "branch", label: "Branch", type: "select", required: true,
          options: ["Army", "Navy", "Air Force", "Marine Corps", "Coast Guard", "Space Force", "National Guard", "Other"] },
        { id: "service_dates", label: "Years of service", type: "text", placeholder: "e.g. 1998 – 2024" },
        { id: "units", label: "Units or duty stations to include", type: "textarea", placeholder: "Optional" },
        { id: "items", label: "What should go in it?", type: "checks",
          options: ["Folded flag", "Medals", "Ribbon rack", "Rank insignia", "Unit patches / crests", "Badges / tabs", "Challenge coins", "Dog tags", "Photos", "Certificate or document", "Other"] },
        { id: "have_items", label: "Do you have all the items?", type: "radio", required: true,
          options: ["Yes, I have everything", "Some items still need to be ordered", "Not sure"] },
        { id: "engraving", label: "Nameplate or engraving text", type: "textarea", placeholder: "Exactly as you want it to read" },
        { id: "background", label: "Background color", type: "select",
          options: ["Help me choose", "Black", "Navy blue", "Burgundy", "Green", "Other"] },
      ],
    },
    {
      id: "flag-case",
      title: "Flag Case",
      blurb: "Burial & presentation flags",
      live: "button%202.jpg",
      examples: [
        { id: "burial-flag-case", title: "Burial Flag Case", text: "For a 5' × 9½' casket flag" },
        { id: "flag-3x5-case", title: "3' × 5' Flag Case", text: "For a standard folded flag" },
        { id: "flag-and-certificate", title: "Flag & Certificate", text: "Flag case with a document holder" },
      ],
      questions: [
        { id: "flag_size", label: "Flag size", type: "radio", required: true,
          options: ["Burial flag (5' × 9½')", "3' × 5'", "Other / not sure"] },
        { id: "folded", label: "Is the flag already folded?", type: "radio",
          options: ["Yes", "No, please fold it"] },
        { id: "extras", label: "Add anything else?", type: "checks",
          options: ["Certificate or document", "Medals", "Photo", "Nothing else"] },
        { id: "engraving", label: "Nameplate or engraving text", type: "textarea", placeholder: "Exactly as you want it to read" },
      ],
    },
    {
      id: "guidon",
      title: "Guidon",
      blurb: "Regulation & non-regulation",
      live: "button%205.jpg",
      examples: [
        { id: "regulation-guidon", title: "Regulation Guidon", live: "button%205.jpg", text: "Made to regulation spec" },
        { id: "non-regulation-guidon", title: "Non-Regulation Guidon", live: "button%2020.jpg", text: "Your custom design & colors" },
      ],
      questions: [
        { id: "designation", label: "Unit designation", type: "text", required: true, placeholder: "e.g. B Co, 2-14 IN" },
        { id: "branch", label: "Branch", type: "select",
          options: ["Army", "Navy", "Air Force", "Marine Corps", "Coast Guard", "Space Force", "National Guard", "Other"] },
        { id: "quantity", label: "How many?", type: "number", required: true, min: 1 },
        { id: "design", label: "Colors, symbols or design notes", type: "textarea", placeholder: "Upload artwork in the next step if you have it" },
      ],
    },
    {
      id: "apparel",
      title: "Embroidery & Apparel",
      blurb: "Unit shirts, hats, polos & more",
      live: "52565901_10161418329605076_7165628496394321920_o.jpg",
      examples: [
        { id: "unit-shirts", title: "Unit Shirts", live: "button%2006.png", text: "Matching shirts for the whole team" },
        { id: "embroidered-polos-hats", title: "Embroidered Polos & Hats", live: "52565901_10161418329605076_7165628496394321920_o.jpg", text: "Logo on the chest or hat front" },
        { id: "custom-printing", title: "Custom Printing", live: "fb_img_1576654875481.jpg", text: "Your design, printed" },
      ],
      questions: [
        { id: "method", label: "Decoration", type: "radio",
          options: ["Embroidery", "Vinyl", "Printing", "Not sure — recommend one"] },
        { id: "garment", label: "What item(s)?", type: "text", required: true, placeholder: "e.g. black T-shirts, hats" },
        { id: "quantity", label: "Total quantity", type: "number", required: true, min: 1 },
        { id: "sizes", label: "Sizes & how many of each", type: "textarea", placeholder: "e.g. S ×4, M ×10, L ×8" },
        { id: "placement", label: "Placement", type: "checks",
          options: ["Left chest", "Full front", "Back", "Sleeve", "Hat front"] },
        { id: "artwork", label: "Artwork", type: "radio", required: true,
          options: ["I have artwork (uploading next)", "I need design help"] },
      ],
    },
    {
      id: "framing",
      title: "Custom Framing",
      blurb: "Art, photos, jerseys & documents",
      live: "button%204.jpg",
      examples: [
        { id: "art-print", title: "Art or Photo", text: "Matted & framed" },
        { id: "jersey", title: "Jersey or Shirt", text: "Framed in a deep case" },
        { id: "diploma-certificate", title: "Diploma or Certificate", text: "Clean & classic" },
      ],
      questions: [
        { id: "piece", label: "What are we framing?", type: "text", required: true },
        { id: "size", label: "Size (width × height)", type: "text", placeholder: "e.g. 16 × 20 in" },
        { id: "glass", label: "Glass", type: "select",
          options: ["Help me choose", "Regular", "UV protective", "Non-glare"] },
        { id: "mat", label: "Mat", type: "select",
          options: ["Help me choose", "Single mat", "Double mat", "No mat"] },
        { id: "style", label: "Frame style or colors you like", type: "textarea", placeholder: "Optional" },
      ],
    },
    {
      id: "award",
      title: "Plaque or Award",
      blurb: "Racing, retirement, lodges & first responders",
      live: "button%2018.jpg",
      examples: [
        { id: "racing-plaque", title: "Racing Plaque", live: "button%2018.jpg", text: "Trophies & awards for your event" },
        { id: "appreciation-plaque", title: "Appreciation Plaque", live: "button%2019.jpg", text: "Retirement, thank-you & farewell" },
        { id: "first-responder", title: "First Responder", live: "button%20014.png", text: "Fire, EMT & law enforcement" },
      ],
      questions: [
        { id: "occasion", label: "What's the occasion?", type: "text", required: true },
        { id: "quantity", label: "How many?", type: "number", required: true, min: 1 },
        { id: "engraving", label: "Engraving text", type: "textarea", placeholder: "Exactly as you want it to read" },
        { id: "logo", label: "Logo or artwork?", type: "radio",
          options: ["Yes (uploading next)", "No"] },
      ],
    },
    {
      id: "other",
      title: "Something Else",
      blurb: "Gifts, slate, prints & ideas",
      live: "button%207.jpg",
      examples: [],
      questions: [
        { id: "idea", label: "Tell us what you have in mind", type: "textarea", required: true },
      ],
    },
  ],
};
