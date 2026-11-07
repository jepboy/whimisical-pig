// Address look-up for the order form and the shop checkout.
// As the customer types their street address, suggestions appear; picking one
// fills in the street, city, state and ZIP. Uses Photon (photon.komoot.io), a
// free address search built on OpenStreetMap. US addresses only, nearest
// Watertown first. If an address isn't found, the fields can still be typed.
//
//   attachAddressLookup({ street, city, state, zip, onFill })
//   (each is an <input>; onFill runs after a suggestion is picked)

(function () {
  const STATES = { Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT",
    Delaware: "DE", "District of Columbia": "DC", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN",
    Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI",
    Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH",
    "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
    Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX",
    Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY", "Puerto Rico": "PR" };
  const abbr = s => STATES[s] || (s && s.length === 2 ? s.toUpperCase() : s || "");

  if (!document.getElementById("addr-style")) {
    const st = document.createElement("style");
    st.id = "addr-style";
    st.textContent = `
      .addr-wrap { position: relative; }
      .addr-list { position: absolute; z-index: 30; left: 0; right: 0; top: calc(100% + 4px); margin: 0; padding: 6px; list-style: none;
        background: #fff; color: #1a0f13; border: 2px solid #000; border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,.35); }
      .addr-list li { padding: 9px 10px; border-radius: 8px; cursor: pointer; line-height: 1.3; }
      .addr-list li small { display: block; color: #6b5a60; font-size: .82rem; }
      .addr-list li[aria-selected="true"], .addr-list li:hover { background: #f9e4eb; }
      .addr-list .addr-none { cursor: default; color: #6b5a60; font-size: .88rem; }
      .addr-list .addr-none:hover { background: none; }`;
    document.head.appendChild(st);
  }

  window.attachAddressLookup = function ({ street, city, state, zip, onFill }) {
    if (!street) return;
    street.setAttribute("autocomplete", "off");
    street.setAttribute("role", "combobox");
    street.setAttribute("aria-autocomplete", "list");
    street.setAttribute("aria-expanded", "false");
    const wrap = document.createElement("div");
    wrap.className = "addr-wrap";
    street.parentNode.insertBefore(wrap, street);
    wrap.appendChild(street);
    const list = document.createElement("ul");
    list.className = "addr-list";
    list.setAttribute("role", "listbox");
    list.id = street.id + "-list";
    list.hidden = true;
    street.setAttribute("aria-controls", list.id);
    wrap.appendChild(list);

    let items = [], active = -1, timer, asked = 0;
    const close = () => { list.hidden = true; street.setAttribute("aria-expanded", "false"); active = -1; };
    const show = () => {
      list.innerHTML = items.length
        ? items.map((a, i) => `<li role="option" id="${list.id}-${i}" aria-selected="${i === active}"></li>`).join("")
        : '<li class="addr-none">No match found. Just type the rest of your address below.</li>';
      items.forEach((a, i) => {
        const li = list.children[i];
        li.textContent = a.line1;
        const sm = document.createElement("small");
        sm.textContent = [a.city, a.state, a.zip].filter(Boolean).join(", ");
        li.appendChild(sm);
        li.onmousedown = e => { e.preventDefault(); pick(i); };
      });
      list.hidden = false;
      street.setAttribute("aria-expanded", "true");
    };
    function pick(i) {
      const a = items[i];
      if (!a) return;
      street.value = a.line1;
      if (city && a.city) city.value = a.city;
      if (state && a.state) state.value = a.state;
      if (zip && a.zip) zip.value = a.zip;
      close();
      [street, city, state, zip].forEach(el => el && el.dispatchEvent(new Event("input", { bubbles: true })));
      if (onFill) onFill(a);
      (zip && !a.zip ? zip : city && !a.city ? city : street).focus();
    }
    async function search(q) {
      const n = ++asked;
      const typedNumber = (q.match(/^\s*(\d+[A-Za-z]?)\s/) || [])[1];
      let data;
      try {
        const url = "https://photon.komoot.io/api/?limit=6&lang=en&lat=43.9748&lon=-75.9108&q=" + encodeURIComponent(q);
        const r = await fetch(url);
        if (!r.ok) return;
        data = await r.json();
      } catch (e) { return; }                       // look-up is a nice-to-have; typing still works
      if (n !== asked) return;                       // a newer search already started
      const seen = new Set();
      items = (data.features || []).map(f => f.properties || {})
        .filter(p => p.countrycode === "US" && (p.street || p.name))
        .map(p => {
          const road = p.street || p.name;
          const num = p.housenumber || typedNumber || "";
          return { line1: [num, road].filter(Boolean).join(" "), city: p.city || p.town || p.village || p.district || p.county || "",
                   state: abbr(p.state), zip: (p.postcode || "").slice(0, 10) };
        })
        .filter(a => { const k = a.line1 + a.city + a.zip; if (seen.has(k)) return false; seen.add(k); return true; })
        .slice(0, 5);
      active = -1;
      show();
    }
    street.addEventListener("input", e => {
      if (!e.isTrusted) return;                      // our own fill-in, not typing
      clearTimeout(timer);
      const q = street.value.trim();
      if (q.length < 5) { close(); return; }
      timer = setTimeout(() => search(q), 280);
    });
    street.addEventListener("keydown", e => {
      if (list.hidden || !items.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        [...list.children].forEach((li, i) => li.setAttribute("aria-selected", i === active));
        street.setAttribute("aria-activedescendant", `${list.id}-${active}`);
      } else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(active); }
      else if (e.key === "Escape") close();
    });
    street.addEventListener("blur", () => setTimeout(close, 150));
  };
})();
