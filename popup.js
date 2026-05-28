let currentMode = "autofill";

async function getProfile() {
  return new Promise(resolve => {
    chrome.storage.local.get("profile", data => resolve(data.profile));
  });
}

document.querySelectorAll(".btn[data-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".btn[data-mode]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;

    const passwordSection = document.getElementById("password-section");

    if (currentMode === "autofill") {
      passwordSection.classList.add("hidden");
    } else {
      passwordSection.classList.remove("hidden");
    }

    setStatus("");
  });
});

document.getElementById("run-btn").addEventListener("click", async () => {
  const profile = await getProfile();
  if (!profile) {
    setStatus('<span class="err">Profile not loaded. Reload the extension.</span>');
    return;
  }

  const emailKey    = document.getElementById("email-select").value;
  const passwordKey = document.getElementById("password-select").value;
  const email       = profile[emailKey] ?? "";
  const password    = profile.passwords?.[passwordKey] ?? "";

  // Inject the selected email as a top-level field so content.js can use it
  const profileWithEmail = { ...profile, email };

  const runBtn = document.getElementById("run-btn");
  runBtn.disabled = true;
  runBtn.textContent = "Filling…";
  setStatus("");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["selectors.js"],
  });

  chrome.tabs.sendMessage(
    tab.id,
    { action: "fill", mode: currentMode, profile: profileWithEmail, password },
    response => {
      runBtn.disabled = false;
      runBtn.textContent = "Fill Fields";

      if (chrome.runtime.lastError || !response) {
        setStatus('<span class="err">Could not reach page. Try refreshing.</span>');
        return;
      }

      const { filled, skipped } = response;
      let html = "";
      if (filled.length)  html += `<span class="ok">✓ ${filled.join(", ")}</span><br>`;
      if (skipped.length) html += `<span class="skip">– Skipped: ${skipped.join(", ")}</span>`;
      if (!html)          html  = '<span class="err">Nothing filled — no matching fields found.</span>';

      setStatus(html);
    }
  );
});

function setStatus(html) {
  document.getElementById("status").innerHTML = html;
}