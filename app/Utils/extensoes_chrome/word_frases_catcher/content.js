// content.js
function saveToExtension(text) {
  chrome.runtime.sendMessage({ action: "save_text", text });
}

// Double-click: capture word
window.addEventListener("dblclick", (e) => {
  const selection = window.getSelection().toString().trim();
  if (selection) {
    saveToExtension(selection);
  }
});

// Key combo: Ctrl+Shift+Y to capture selection
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "y") {
    const selection = window.getSelection().toString().trim();
    if (selection) {
      saveToExtension(selection);
    }
  }
});
