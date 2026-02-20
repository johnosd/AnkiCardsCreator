function sendTogglePanel(tabId, callback) {
  chrome.tabs.sendMessage(tabId, { action: "toggle_panel" }, () => {
    callback(chrome.runtime.lastError);
  });
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) {
    return;
  }

  sendTogglePanel(tab.id, (sendError) => {
    if (!sendError) {
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        files: ["content.js"]
      },
      () => {
        const injectError = chrome.runtime.lastError;
        if (injectError) {
          console.warn("Nao foi possivel abrir o painel nesta pagina:", injectError.message);
          return;
        }

        sendTogglePanel(tab.id, (retryError) => {
          if (retryError) {
            console.warn("Falha ao abrir painel apos injecao:", retryError.message);
          }
        });
      }
    );
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "save_text" && msg.text) {
    chrome.storage.local.get(["captured"], (result) => {
      const captured = Array.isArray(result.captured) ? result.captured : [];
      captured.push(msg.text);
      chrome.storage.local.set({ captured }, () => {
        sendResponse({ ok: true });
      });
    });
    return true;
  }

  if (msg.action === "get_captured") {
    chrome.storage.local.get(["captured"], (result) => {
      sendResponse(result.captured || []);
    });
    return true;
  }

  if (msg.action === "clear_captured") {
    const captured = [];
    chrome.storage.local.set({ captured }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});
