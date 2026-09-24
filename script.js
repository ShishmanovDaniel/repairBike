// ========== Page switching (every page lives inside index.html) ==========
// Links like "#services" or "#book?service=flat-fix" pick which page to show.
function currentRoute() {
  const raw = decodeURIComponent(window.location.hash.slice(1)) || "home";
  const [name, query = ""] = raw.split("?");
  return { name, params: new URLSearchParams(query) };
}

(function () {
  const pages = document.querySelectorAll(".page");
  const navLinks = document.querySelectorAll('.site-nav a[href^="#"]');
  const nav = document.getElementById("site-nav");
  const toggle = document.querySelector(".nav-toggle");
  let firstLoad = true;

  function showPage() {
    let { name } = currentRoute();
    if (!document.getElementById("page-" + name)) name = "home";
    const page = document.getElementById("page-" + name);

    // Show only the chosen page
    pages.forEach((p) => { p.hidden = p !== page; });

    // Underline the current page in the menu
    navLinks.forEach((link) => {
      const target = link.getAttribute("href").slice(1).split("?")[0];
      if (target === name) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    // Update the browser tab title
    document.title = page.dataset.title;

    // Close the phone menu after choosing a page
    if (nav && toggle) {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }

    // Jump to the top and move keyboard focus to the new page's heading
    if (!firstLoad) {
      window.scrollTo(0, 0);
      const heading = page.querySelector("h1");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }
    firstLoad = false;
  }

  window.addEventListener("hashchange", showPage);
  showPage();
})();

// ========== Mobile menu (runs on every page) ==========
(function () {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("open", !open);
  });

  // Close the menu with the Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("open");
      toggle.focus();
    }
  });
})();

// ========== Highlight today's opening hours (About section) ==========
(function () {
  const rows = document.querySelectorAll(".hours tr[data-day]");
  const today = String(new Date().getDay());
  rows.forEach((row) => {
    if (row.dataset.day.split(" ").includes(today)) row.classList.add("today");
  });
})();

// ========== Booking form (Book section) ==========
(function () {
  const form = document.getElementById("booking-form");
  if (!form) return;

  // Labor prices, used for the estimate box
  const prices = {
    "flat-fix": "$15", "basic-tune-up": "$65", "standard-tune-up": "$110",
    "full-overhaul": "$180", "tubeless-setup": "$30", "wheel-true": "$25",
    "spoke-replacement": "$20", "brake-adjustment": "$15", "brake-bleed": "$30",
    "pad-replacement": "$12", "gear-adjustment": "$20", "chain-replacement": "$15",
    "cable-replacement": "$20", "e-bike-check": "$45", "battery-test": "$25",
    "wiring-repair": "$70 per hour", "not-sure": "Free inspection"
  };

  const serviceSelect = form.elements.service;
  const estimate = document.getElementById("estimate");
  const estimatePrice = document.getElementById("estimate-price");

  function updateEstimate() {
    const price = prices[serviceSelect.value];
    estimate.hidden = !price;
    if (price) estimatePrice.textContent = price;
  }
  serviceSelect.addEventListener("change", updateEstimate);

  // ========== Pre-select a service from the link (#book?service=...) ==========
  function applyFromLink() {
    const { name, params } = currentRoute();
    const fromLink = params.get("service");
    if (name === "book" && fromLink && prices[fromLink]) {
      serviceSelect.value = fromLink;
      updateEstimate();
    }
  }
  window.addEventListener("hashchange", applyFromLink);
  applyFromLink();

  // ========== Character counter for the notes box ==========
  const notes = form.elements.notes;
  const counter = document.getElementById("notes-counter");
  notes.addEventListener("input", () => {
    counter.textContent = notes.value.length + " / " + notes.maxLength;
  });

  // ========== Block past dates in the date picker ==========
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const todayStr = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
  form.elements.date.min = todayStr;

  // ========== Rules for each field (returns true or an error message) ==========
  const rules = {
    name: (v) => v.trim().length >= 2 || "Enter your name.",
    phone: (v) => v.replace(/\D/g, "").length >= 10 || "Enter a 10-digit phone number.",
    bike: (v) => v !== "" || "Choose the type of bike.",
    service: (v) => v !== "" || "Choose a service, or pick \"Not sure\".",
    date: (v) => {
      if (!v) return "Pick a drop-off day.";
      if (v < todayStr) return "Pick today or a later day.";
      const day = new Date(v + "T12:00:00").getDay();
      if (day === 1) return "We're closed Mondays. Pick another day.";
      return true;
    },
    time: (v) => v !== "" || "Choose a drop-off time."
  };

  // ========== Check one field and show or clear its error ==========
  function check(field) {
    const input = form.elements[field];
    const result = rules[field](input.value);
    const errorEl = document.getElementById(field + "-error");
    if (result === true) {
      input.removeAttribute("aria-invalid");
      errorEl.textContent = "";
      return true;
    }
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", field + "-error");
    errorEl.textContent = result;
    return false;
  }

  // ========== Check each field when the user leaves it ==========
  Object.keys(rules).forEach((field) => {
    form.elements[field].addEventListener("blur", () => check(field));
  });

  // ========== On submit: check everything, then show confirmation ==========
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const results = Object.keys(rules).map(check);
    if (results.includes(false)) {
      form.querySelector('[aria-invalid="true"]').focus();
      return;
    }

    const name = form.elements.name.value.trim().split(" ")[0];
    const date = new Date(form.elements.date.value + "T12:00:00")
      .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const time = form.elements.time.value.toLowerCase();
    const service = serviceSelect.options[serviceSelect.selectedIndex].text;

    const success = document.createElement("div");
    success.className = "success";
    success.setAttribute("role", "status");
    success.setAttribute("tabindex", "-1");
    success.innerHTML = "<h2></h2><p class='when'></p><p class='what'></p>";
    success.querySelector("h2").textContent = "Booked, " + name + ".";
    success.querySelector(".when").textContent = "Drop-off: " + date + ", " + time + ".";
    success.querySelector(".what").textContent = "Service: " + service + ". Expect a confirmation text within a few hours.";
    form.replaceChildren(success);
    success.focus();
  });
})();
