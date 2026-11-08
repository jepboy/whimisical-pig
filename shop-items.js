// =====================================================================
//  THE WHIMSICAL PIG — BACKUP SHOP LIST
//  Only used if Square isn't connected at all. With Square connected, the shop
//  shows Square's "Website" category, or "Coming soon" while that's empty. Until then, edit this
//  to change what's shown. Keep the quotes and commas in place.
//
//  For each item:
//    name     what the customer sees
//    price    e.g. "$45.00" (leave "" to hide the price)
//    image    a photo on this site, e.g. "images/work/military-shadow-boxes_17-sm.webp"
//             (leave "" for a plain placeholder)
//    note     one short line, e.g. "Ready to ship" or "Choose your unit"
//    buyUrl   the checkout link from Square or Stripe (see README).
//             Leave "" and the button becomes "Call to order".
//    category used for the filter buttons at the top of the shop
//    soldOut  true to show the item as sold out
// =====================================================================

window.SHOP = {
  items: [
    {
      name: "10th Mountain Snowshoes",
      price: "",
      image: "images/work/military-shadow-boxes_17-sm.webp",
      note: "Ready-made",
      buyUrl: "",
      category: "Military",
    },
    {
      name: "Evident Truths Products",
      price: "",
      image: "",
      note: "Ready-made",
      buyUrl: "",
      category: "Gifts",
    },
    {
      name: "Sublimated Image on Slate",
      price: "",
      image: "",
      note: "Send us your photo after checkout",
      buyUrl: "",
      category: "Gifts",
    },
    {
      name: "Sublimated Plate on Wooden Plaque",
      price: "",
      image: "",
      note: "Send us your photo after checkout",
      buyUrl: "",
      category: "Gifts",
    },
    {
      name: "Masonic Items",
      price: "",
      image: "",
      note: "Ready-made",
      buyUrl: "",
      category: "Gifts",
    },
    {
      name: "Firemen, EMT & LEO Items",
      price: "",
      image: "",
      note: "Ready-made",
      buyUrl: "",
      category: "First Responders",
    },
  ],
};
