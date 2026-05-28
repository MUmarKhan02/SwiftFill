// Runs once when the extension is installed or reloaded.
// Fetches profile.json (bundled with the extension) and stores it
// in chrome.storage.local so popup.js can read it.

chrome.runtime.onInstalled.addListener(async () => {
  const url  = chrome.runtime.getURL("profile.json");
  const resp = await fetch(url);
  const profile = await resp.json();
  chrome.storage.local.set({ profile });
  console.log("SwiftFill: profile loaded into storage.");
});
