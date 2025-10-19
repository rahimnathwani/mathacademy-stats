// This script runs in the MAIN world and has access to page variables
export default defineContentScript({
  matches: ['*://*.mathacademy.com/*', '*://mathacademy.com/*'],
  world: 'MAIN',
  main() {
    console.log('[Math Academy Stats] MAIN world script loaded');

    // Listen for requests from the isolated world script
    window.addEventListener('message', (event) => {
      // Only accept messages from same window
      if (event.source !== window) return;

      if (event.data.type === 'GET_MATH_ACADEMY_IDS_REQUEST') {
        console.log('[Math Academy Stats] Received request for IDs');

        // Access page variables
        const win = window as any;
        const result = {
          type: 'GET_MATH_ACADEMY_IDS_RESPONSE',
          studentId: typeof win.studentId !== 'undefined' ? win.studentId : null,
          courseId: typeof win.courseId !== 'undefined' ? win.courseId : null
        };

        console.log('[Math Academy Stats] Sending IDs:', result);
        window.postMessage(result, '*');
      }
    });
  },
});
