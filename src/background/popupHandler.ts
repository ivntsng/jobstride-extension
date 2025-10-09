function createPopup(): void {
  chrome.windows.create({
    url: chrome.runtime.getURL('popup/popup.html'),
    type: 'popup',
    width: 400,
    height: 600,
  });
}

chrome.action.onClicked.addListener((tab) => {
  createPopup();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_POPUP') {
    createPopup();
    sendResponse({ success: true });
  }
});
