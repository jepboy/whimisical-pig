// =====================================================================
//  THE WHIMSICAL PIG — SHOP SETTINGS
//  One place for links and notices used across the whole site.
//  Leave anything as "" to hide it.
// =====================================================================

window.SETTINGS = {
  // A short notice shown in a bar at the very top of every page.
  // e.g. "Christmas orders: please order by December 1." or "Closed Monday for Memorial Day."
  announcement: "",

  // Online booking for consultations (Square Appointments, Calendly, etc.).
  // When set, "Book a Consultation" buttons appear.
  bookingUrl: "",

  // Link where customers can leave a review (e.g. your Google review link).
  reviewsUrl: "",

  // Gift card purchase link (e.g. Square eGift Cards).
  giftCardUrl: "",

  // Help page: questions customers ask most. Edit the answers to match how
  // the shop works. {phone} and {email} are filled in automatically.
  faq: [
    {
      q: "Do I need an appointment?",
      a: "No. Stop by any time during shop hours. If you'd like one-on-one time to plan a bigger piece, call ahead at {phone} and we'll set aside time for you.",
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
      a: "Yes. Start an order online, then mail your items to us. See “Mailing your items” below for packing tips, and call us first so we know they're coming.",
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
