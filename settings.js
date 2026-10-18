// =====================================================================
//  THE WHIMSICAL PIG — SHOP SETTINGS
//  One place for links and notices used across the whole site.
//  Leave anything as "" to hide it.
// =====================================================================

window.SETTINGS = {
  // A short notice shown in a bar at the very top of every page.
  // e.g. "Christmas orders: please order by December 1." or "Closed Monday for Memorial Day."
  announcement: "",

  // Link where customers can leave a review (e.g. your Google review link).
  reviewsUrl: "",

  // Gift card purchase link (e.g. Square eGift Cards).
  giftCardUrl: "",

  // Photos you've added to the images/ folder. Until a name is listed here, the
  // site uses the photo from the current website instead.
  // e.g. ["embroidery.jpg", "flag-and-shadow-boxes.jpg", "slide-military-framing.jpg"]
  localPhotos: [],

  // Help page: questions customers ask most. Edit the answers to match how
  // the shop works. {phone} and {email} are filled in automatically.
  faq: [
    {
      q: "How do I start an order?",
      a: "Fill out our Start an Order form. It walks you through everything we need, including photos of your items. Have a question first? Email us at {email}.",
    },
    {
      q: "How long will my order take?",
      a: "Every piece is different. We'll give you an estimated completion date with your quote. If you have a ceremony or event date, add it to your order so we can plan around it.",
    },
    {
      q: "Do you take deposits?",
      a: "If a deposit is needed, we'll let you know with your quote. You can pay it online with Quick Pay on our Shop page, or by phone.",
    },
    {
      q: "Will I see the design before it's made?",
      a: "We'll go over the layout and details with you before we build, so there are no surprises.",
    },
    {
      q: "I'm not local. Can I still order?",
      a: "Yes. Start an order online, then mail your items to us. See “Mailing your items” below for packing tips, and email us at {email} so we know they're coming.",
    },
    {
      q: "I'm missing some medals or insignia. Can you help?",
      a: "Tell us what's missing in your order and we'll let you know your options.",
    },
    {
      q: "How will I know my order is ready?",
      a: "We'll contact you the way you prefer (call, text or email) as soon as it's ready for pickup.",
    },
  ],
};
