import { MATH_ACADEMY_MATCHES } from '@/utils/constants';

// Runs in the ISOLATED world: has access to extension APIs, but not to the
// page's JavaScript variables. Bridges extension messages to the MAIN world
// script via window.postMessage.
export default defineContentScript({
  matches: MATH_ACADEMY_MATCHES,
  main() {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_MATH_ACADEMY_IDS') {
        // Request data from the MAIN world script
        window.postMessage({ type: 'GET_MATH_ACADEMY_IDS_REQUEST' }, '*');

        // Listen for response from MAIN world script
        const messageHandler = (event: MessageEvent) => {
          if (event.source !== window) return;

          if (event.data.type === 'GET_MATH_ACADEMY_IDS_RESPONSE') {
            window.removeEventListener('message', messageHandler);

            sendResponse({
              studentId: event.data.studentId,
              courseId: event.data.courseId,
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
            courseId: null,
          });
        }, 2000);

        return true; // Keep channel open for async response
      }
    });
  },
});
