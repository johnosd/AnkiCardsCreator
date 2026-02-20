(() => {
const INIT_ATTR = "data-wpc-initialized";
if (document.documentElement.hasAttribute(INIT_ATTR)) {
  return;
}
document.documentElement.setAttribute(INIT_ATTR, "1");

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
  const existingPanel = document.getElementById(PANEL_ID);
  if (existingPanel) {
    panelEl = existingPanel;
    textareaEl = panelEl.querySelector("#wpc-captured");
    return panelEl;
  }

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
    #${PANEL_ID} .wpc-drag-handle {
      margin: -4px -4px 8px -4px;
      padding: 6px 8px;
      cursor: move;
      user-select: none;
      border-radius: 8px;
      background: #f3f4f6;
    }
    #${PANEL_ID} h3 {
      margin: 0;
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
    <div class="wpc-drag-handle">
      <h3>Word & Phrase Catcher</h3>
    </div>
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

  const dragHandle = panelEl.querySelector(".wpc-drag-handle");
  setupDragging(panelEl, dragHandle);

  refreshList();
  return panelEl;
}

function setupDragging(panel, handle) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const onMouseMove = (e) => {
    if (!isDragging) {
      return;
    }

    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    const maxLeft = Math.max(0, window.innerWidth - panelWidth);
    const maxTop = Math.max(0, window.innerHeight - panelHeight);
    const nextLeft = Math.min(Math.max(0, e.clientX - offsetX), maxLeft);
    const nextTop = Math.min(Math.max(0, e.clientY - offsetY), maxTop);

    panel.style.left = `${nextLeft}px`;
    panel.style.top = `${nextTop}px`;
    panel.style.right = "auto";
  };

  const onMouseUp = () => {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    document.body.style.userSelect = "";
  };

  const onMouseDown = (e) => {
    if (e.button !== 0) {
      return;
    }
    isDragging = true;
    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    document.body.style.userSelect = "none";
    e.preventDefault();
  };

  handle.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);

  return () => {
    handle.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };
}

function openPanel() {
  const panel = createPanel();
  panel.style.display = "block";
  refreshList();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "open_panel" || msg.action === "toggle_panel") {
    openPanel();
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
