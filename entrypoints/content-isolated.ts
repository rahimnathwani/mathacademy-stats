// This script runs in the ISOLATED world and has access to extension APIs
export default defineContentScript({
  matches: ['*://*.mathacademy.com/*', '*://mathacademy.com/*'],
  main() {
    console.log('[Math Academy Stats] ISOLATED world script loaded');

    // Listen for requests from the extension
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[Math Academy Stats] Received extension message:', message.type);

      if (message.type === 'GET_MATH_ACADEMY_IDS') {
        // Request data from the MAIN world script
        window.postMessage({ type: 'GET_MATH_ACADEMY_IDS_REQUEST' }, '*');

        // Listen for response from MAIN world script
        const messageHandler = (event: MessageEvent) => {
          if (event.source !== window) return;

          if (event.data.type === 'GET_MATH_ACADEMY_IDS_RESPONSE') {
            console.log('[Math Academy Stats] Got IDs from MAIN world:', event.data);
            window.removeEventListener('message', messageHandler);

            sendResponse({
              studentId: event.data.studentId,
              courseId: event.data.courseId
            });
          }
        };

        window.addEventListener('message', messageHandler);

        // Set timeout in case MAIN world doesn't respond
        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          sendResponse({
            error: 'Timeout waiting for page data',
            studentId: null,
            courseId: null
          });
        }, 2000);

        return true; // Keep channel open for async response
      }
    });
  },
});
