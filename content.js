// Listens for fill commands from popup.js via chrome.runtime messages

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "fill") {
    const results = runFill(message.mode, message.profile, message.password);
    sendResponse(results);
  }
  return true; // keep channel open for async
});

// ── Core fill logic ────────────────────────────────────────────────────────────

function runFill(mode, profile, password) {
  const filled = [];
  const skipped = [];

  function fill(label, selectors, value) {
    if (!value) return;
    if (tryFill(selectors, value)) {
      filled.push(label);
    } else if (tryFillByLabel(label, value)) {
      filled.push(label + " (label match)");
    } else {
      skipped.push(label);
    }
  }

  if (mode === "autofill") {
    fill("First name",     SELECTORS.first_name,     profile.first_name);
    fill("Middle name",    SELECTORS.middle_name,     profile.middle_name);
    fill("Last name",      SELECTORS.last_name,       profile.last_name);
    fill("Full name",      SELECTORS.full_name,       profile.full_name);
    fill("Preferred name", SELECTORS.preferred_name,  profile.preferred_name);
    fill("Email",          SELECTORS.email,           profile.email);
    fill("Phone",          SELECTORS.phone,           profile.phone);
    fill("Street address", SELECTORS.street_address,  profile.street_address);
    fill("City",           SELECTORS.city,            profile.city);
    fill("State/Province", SELECTORS.state,           profile.state);
    fill("Postal code",    SELECTORS.postal_code,     profile.postal_code);
    fill("Country",        SELECTORS.country,         profile.country);
    fill("LinkedIn",       SELECTORS.linkedin,        profile.linkedin);
    fill("GitHub",         SELECTORS.github,          profile.github);
    fill("Portfolio",      SELECTORS.portfolio,       profile.portfolio);
  }

  if (mode === "signup") {
    fill("First name", SELECTORS.first_name, profile.first_name);
    fill("Last name",  SELECTORS.last_name,  profile.last_name);
    fill("Full name",  SELECTORS.full_name,  profile.full_name);
    fill("Email",      SELECTORS.email,      profile.email);
    fill("Phone",      SELECTORS.phone,      profile.phone);
    // First password field
    if (tryFill(SELECTORS.password, password)) {
      filled.push("Password");
    } else {
      skipped.push("Password");
    }
    // Confirm password — second input[type="password"] on the page
    if (tryFillNth('input[type="password"]', password, 1)) {
      filled.push("Confirm password");
    } else {
      skipped.push("Confirm password");
    }
  }

  if (mode === "login") {
    fill("Email",    SELECTORS.email,    profile.email);
    if (tryFill(SELECTORS.password, password)) {
      filled.push("Password");
    } else {
      skipped.push("Password");
    }
  }

  return { filled, skipped };
}

// ── Fill helpers ───────────────────────────────────────────────────────────────

function tryFill(selectors, value) {
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el && isUsable(el)) {
        setNativeValue(el, value);
        return true;
      }
    } catch (_) {}
  }
  return false;
}

function tryFillNth(selector, value, nth) {
  try {
    const els = document.querySelectorAll(selector);
    const el = els[nth];
    if (el && isUsable(el)) {
      setNativeValue(el, value);
      return true;
    }
  } catch (_) {}
  return false;
}

function isUsable(el) {
  return !el.disabled && el.offsetParent !== null;
}

// React/Vue/Angular frameworks track input state internally.
// A plain el.value = x won't trigger their onChange handlers.
// This fires the native input + change events so frameworks pick it up.
function setNativeValue(el, value) {
  if (el.tagName === "SELECT") {
    trySelectOption(el, value);
    return;
  }
  el.scrollIntoView();
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value"
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input",  { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("blur",   { bubbles: true }));
}

function trySelectOption(el, value) {
  // Try exact value match
  for (const opt of el.options) {
    if (opt.value === value || opt.value.toLowerCase() === value.toLowerCase()) {
      el.value = opt.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
  }
  // Try label match (partial)
  for (const opt of el.options) {
    if (opt.text.toLowerCase().includes(value.toLowerCase())) {
      el.value = opt.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
  }
}
function tryFillByLabel(labelText, value) {
  if (!value) return false;

  const labels = document.querySelectorAll("label");

  for (const label of labels) {
    if (label.textContent.trim().toLowerCase().includes(labelText.toLowerCase())) {

      let input = null;

      // Method 1: label has a "for" attribute pointing to input id
      if (label.htmlFor) {
        input = document.getElementById(label.htmlFor);
      }

      // Method 2: input is nested inside the label
      if (!input) {
        input = label.querySelector("input, textarea");
      }

      // Method 3: input is the next sibling element
      if (!input) {
        input = label.nextElementSibling?.querySelector("input, textarea")
               ?? label.nextElementSibling;
      }

      if (input && isUsable(input)) {
        input.scrollIntoView();
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, "value"
        )?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, value);
        } else {
          input.value = value;
        }
        input.dispatchEvent(new Event("input",  { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("blur",   { bubbles: true }));
        return true;
      }
    }
  }
  return false;
}