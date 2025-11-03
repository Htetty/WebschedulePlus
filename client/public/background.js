chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (chrome.sidePanel?.setOptions) {
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: "index.html",
        enabled: true,
      });
    }
    if (chrome.sidePanel?.open) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  } catch (err) {
    console.error("Failed to open side panel:", err);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (
    message &&
    message.type === "openTab" &&
    typeof message.url === "string"
  ) {
    try {
      chrome.tabs.create({ url: message.url, active: true });
    } catch (err) {
      // no-op
    }
  }
});
