// Background service worker
// Handles any future background tasks or message passing

chrome.runtime.onInstalled.addListener(() => {
  console.log('Gemini Collaborator installed.');
});
