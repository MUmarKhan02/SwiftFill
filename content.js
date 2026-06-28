chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "fill") {
    const results = runFill(message.mode, message.profile, message.password);
    sendResponse(results);
  }
  return true;
});

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

  function fillRadio(label, keywords, value) {
    if (tryFillRadioByLabel(keywords, value)) {
      filled.push(label);
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

    // ── Voluntary / EEO
    fill("Gender",     SELECTORS.gender,     profile.gender);
    fill("Ethnicity",  SELECTORS.ethnicity,  profile.ethnicity);
    fill("Disability", SELECTORS.disability, profile.disability);
    fill("Veteran",    SELECTORS.veteran,    profile.veteran);

    fillRadio("Gender (radio)",     ["gender", "sex"],     profile.gender);
    fillRadio("Ethnicity (radio)",  ["ethnicity", "race"], profile.ethnicity);
    fillRadio("Disability (radio)", ["disability"],        profile.disability);
    fillRadio("Veteran (radio)",    ["veteran"],           profile.veteran);

    // ── Work authorization & sponsorship
    fill("Work authorization", SELECTORS.work_authorization, profile.work_authorization);
    fill("Sponsorship",        SELECTORS.sponsorship,        profile.sponsorship);

    fillRadio("Work authorization (radio)", ["authorized", "authorization", "legally allowed", "work in"], profile.work_authorization);
    fillRadio("Sponsorship (radio)",        ["sponsor", "visa", "sponsorship"],                            profile.sponsorship);
  }

  if (mode === "signup") {
    fill("First name", SELECTORS.first_name, profile.first_name);
    fill("Last name",  SELECTORS.last_name,  profile.last_name);
    fill("Full name",  SELECTORS.full_name,  profile.full_name);
    fill("Email",      SELECTORS.email,      profile.email);

    if (tryFillNth('input[type="email"]', profile.email, 1)) {
      filled.push("Confirm email");
    } else if (tryFillNth('input[name*="email" i]', profile.email, 1)) {
      filled.push("Confirm email");
    } else {
      skipped.push("Confirm email");
    }

    fill("Phone", SELECTORS.phone, profile.phone);

    if (tryFill(SELECTORS.password, password)) {
      filled.push("Password");
    } else {
      skipped.push("Password");
    }

    if (tryFillNth('input[type="password"]', password, 1)) {
      filled.push("Confirm password");
    } else {
      skipped.push("Confirm password");
    }
  }

  if (mode === "login") {
    fill("Email", SELECTORS.email, profile.email);
    if (tryFill(SELECTORS.password, password)) {
      filled.push("Password");
    } else {
      skipped.push("Password");
    }
  }

  return { filled, skipped };
}

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

function tryFillRadioByLabel(keywords, value) {
  if (!value) return false;

  const radios = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');

  for (const radio of radios) {
    let labelText = "";

    if (radio.id) {
      const label = document.querySelector(`label[for="${radio.id}"]`);
      if (label) labelText = label.textContent.trim();
    }
    if (!labelText && radio.closest("label")) {
      labelText = radio.closest("label").textContent.trim();
    }
    if (!labelText && radio.getAttribute("aria-label")) {
      labelText = radio.getAttribute("aria-label").trim();
    }

    if (!labelText) continue;

    if (labelText.toLowerCase().includes(value.toLowerCase())) {
      const container = radio.closest("fieldset, div, section, form");
      if (container) {
        const containerText = container.textContent.toLowerCase();
        const keywordMatch = keywords.some(k => containerText.includes(k.toLowerCase()));
        if (!keywordMatch) continue;
      }

      radio.scrollIntoView();
      radio.click();
      radio.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
  }
  return false;
}

function isUsable(el) {
  if (el.tagName === "SELECT" && el.hasAttribute("aria-hidden")) return true;
  return !el.disabled && el.offsetParent !== null;
}

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
  for (const opt of el.options) {
    if (opt.value === value || opt.value.toLowerCase() === value.toLowerCase()) {
      el.value = opt.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
  }
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

      if (label.htmlFor) {
        input = document.getElementById(label.htmlFor);
      }
      if (!input) {
        input = label.querySelector("input, textarea");
      }
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