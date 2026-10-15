// =====================================================================
//  THE WHIMSICAL PIG — SHOP ITEMS
//  Edit this file to change what's for sale. No coding needed beyond
//  keeping the quotes and commas in place.
//
//  For each item:
//    name     what the customer sees
//    price    e.g. "$45.00" (leave "" to hide the price)
//    image    a photo in the images/shop/ folder, e.g. "images/shop/snowshoes.jpg"
//             (leave "" to use the photo from the current website)
//    note     one short line, e.g. "Ready to ship" or "Choose your unit"
//    buyUrl   the checkout link from Square or Stripe (see README).
//             Leave "" and the button becomes "Call to order".
//    category used for the filter buttons at the top of the shop
//    soldOut  true to show the item as sold out
// =====================================================================

window.SHOP = {
  // Quick Pay: one link where customers pay an invoice, deposit or balance.
  // Make it a "customer chooses the amount" payment link in Square or Stripe.
  quickPay: {
    buyUrl: "",
  },

  items: [
    {
      name: "10th Mountain Snowshoes",
      price: "",
      image: "",
      live: "button%2011.jpg",
      note: "Ready-made",
      buyUrl: "",
      category: "Military",
    },
    {
      name: "Evident Truths Products",
      price: "",
      image: "",
      live: "button%20013.png",
      note: "Ready-made",
      buyUrl: "",
      category: "Gifts",
    },
    {
      name: "Sublimated Image on Slate",
      price: "",
      image: "",
      live: "button%2010.jpg",
      note: "Send us your photo after checkout",
      buyUrl: "",
      category: "Gifts",
    },
    {
      name: "Sublimated Plate on Wooden Plaque",
      price: "",
      image: "",
      live: "button%2019.jpg",
      note: "Send us your photo after checkout",
      buyUrl: "",
      category: "Gifts",
    },
    {
      name: "Masonic Items",
      price: "",
      image: "",
      live: "button%2015.png",
      note: "Ready-made",
      buyUrl: "",
      category: "Gifts",
    },
    {
      name: "Firemen, EMT & LEO Items",
      price: "",
      image: "",
      live: "button%20014.png",
      note: "Ready-made",
      buyUrl: "",
      category: "First Responders",
    },
  ],
};
