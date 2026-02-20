// background.js
let captured = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "save_text" && msg.text) {
    captured.push(msg.text);
    chrome.storage.local.set({ captured });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "get_captured") {
    chrome.storage.local.get(["captured"], (result) => {
      sendResponse(result.captured || []);
    });
    return true;
  }
  if (msg.action === "clear_captured") {
    captured = [];
    chrome.storage.local.set({ captured });
    sendResponse(true);
  }
});
