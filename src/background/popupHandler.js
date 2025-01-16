chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: createPopup,
  });
});

function createPopup() {
  if (document.getElementById("job-tracker-extension-popup")) {
    return;
  }

  const popup = document.createElement("div");
  popup.id = "job-tracker-extension-popup";

  // Load the popup HTML content
  fetch(chrome.runtime.getURL("src/popup/popup.html"))
    .then((response) => response.text())
    .then((html) => {
      popup.innerHTML = html;
      document.body.appendChild(popup);

      // Load and execute popup.js
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("src/popup/popup.js");
      document.body.appendChild(script);
    });
}
