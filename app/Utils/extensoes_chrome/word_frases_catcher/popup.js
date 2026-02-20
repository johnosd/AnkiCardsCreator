// popup.js
function updateList() {
  chrome.runtime.sendMessage({ action: "get_captured" }, (list) => {
    document.getElementById("captured").value = (list || []).join("\n");
  });
}

document.getElementById("export").onclick = function () {
  chrome.runtime.sendMessage({ action: "get_captured" }, (list) => {
    const blob = new Blob([(list || []).join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "captured_words_phrases.txt";
    a.click();
    URL.revokeObjectURL(url);
  });
};

document.getElementById("clear").onclick = function () {
  chrome.runtime.sendMessage({ action: "clear_captured" }, () => {
    updateList();
  });
};

document.addEventListener("DOMContentLoaded", updateList);
