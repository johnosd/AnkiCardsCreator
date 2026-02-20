(() => {
if (window.__wpcInitialized) {
  return;
}
window.__wpcInitialized = true;

const PANEL_ID = "wpc-floating-panel";
let panelEl = null;
let textareaEl = null;
let lastCapturedText = "";
let lastCapturedAt = 0;

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

async function saveToExtension(text) {
  const now = Date.now();
  if (text === lastCapturedText && now - lastCapturedAt < 800) {
    return;
  }
  lastCapturedText = text;
  lastCapturedAt = now;
  await sendMessage({ action: "save_text", text });
  await refreshList();
}

function getCurrentSelectionText() {
  return window.getSelection().toString().trim();
}

async function getCaptured() {
  const list = await sendMessage({ action: "get_captured" });
  return Array.isArray(list) ? list : [];
}

async function refreshList() {
  if (!textareaEl) {
    return;
  }
  const list = await getCaptured();
  textareaEl.value = list.join("\n");
}

function createPanel() {
  if (panelEl) {
    return panelEl;
  }

  const style = document.createElement("style");
  style.textContent = `
    #${PANEL_ID} {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      width: 340px;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
      padding: 12px;
      font-family: Arial, sans-serif;
      color: #111827;
    }
    #${PANEL_ID} h3 {
      margin: 0 0 8px 0;
      font-size: 15px;
    }
    #${PANEL_ID} textarea {
      width: 100%;
      min-height: 150px;
      resize: vertical;
      box-sizing: border-box;
      margin-bottom: 8px;
    }
    #${PANEL_ID} .wpc-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    #${PANEL_ID} button {
      border: 1px solid #d1d5db;
      background: #f9fafb;
      border-radius: 6px;
      padding: 6px 10px;
      cursor: pointer;
      font-size: 12px;
    }
    #${PANEL_ID} button:hover {
      background: #f3f4f6;
    }
  `;
  document.documentElement.appendChild(style);

  panelEl = document.createElement("div");
  panelEl.id = PANEL_ID;
  panelEl.style.display = "none";
  panelEl.innerHTML = `
    <h3>Word & Phrase Catcher</h3>
    <textarea id="wpc-captured" readonly></textarea>
    <div class="wpc-actions">
      <button id="wpc-export">Exportar TXT</button>
      <button id="wpc-clear">Limpar</button>
      <button id="wpc-close">Fechar painel</button>
    </div>
  `;
  document.body.appendChild(panelEl);

  textareaEl = panelEl.querySelector("#wpc-captured");

  panelEl.querySelector("#wpc-export").addEventListener("click", async () => {
    const list = await getCaptured();
    const blob = new Blob([list.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "captured_words_phrases.txt";
    a.click();
    URL.revokeObjectURL(url);
  });

  panelEl.querySelector("#wpc-clear").addEventListener("click", async () => {
    await sendMessage({ action: "clear_captured" });
    await refreshList();
  });

  panelEl.querySelector("#wpc-close").addEventListener("click", () => {
    panelEl.style.display = "none";
  });

  refreshList();
  return panelEl;
}

function togglePanel() {
  const panel = createPanel();
  if (panel.style.display === "none") {
    panel.style.display = "block";
    refreshList();
    return;
  }
  panel.style.display = "none";
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "toggle_panel") {
    togglePanel();
  }
});

window.addEventListener("dblclick", (e) => {
  if (panelEl && panelEl.contains(e.target)) {
    return;
  }

  const selection = getCurrentSelectionText();
  if (selection) {
    saveToExtension(selection);
  }
});

window.addEventListener("mouseup", (e) => {
  if (e.button !== 0) {
    return;
  }
  if (panelEl && panelEl.contains(e.target)) {
    return;
  }

  const selection = getCurrentSelectionText();
  if (selection) {
    saveToExtension(selection);
  }
});

window.addEventListener("keydown", (e) => {
  if (panelEl && panelEl.contains(e.target)) {
    return;
  }

  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "y") {
    const selection = getCurrentSelectionText();
    if (selection) {
      saveToExtension(selection);
    }
  }
});
})();
