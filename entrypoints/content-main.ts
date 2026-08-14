import { MATH_ACADEMY_MATCHES } from '@/utils/constants';

// Runs in the MAIN world: can read the page's JavaScript variables
// (studentId, courseId) but has no extension API access. Answers requests
// relayed by the ISOLATED world script.
export default defineContentScript({
  matches: MATH_ACADEMY_MATCHES,
  world: 'MAIN',
  main() {
    window.addEventListener('message', (event) => {
      // Only accept messages from same window
      if (event.source !== window) return;

      if (event.data.type === 'GET_MATH_ACADEMY_IDS_REQUEST') {
        const win = window as typeof window & { studentId?: number; courseId?: number };
        window.postMessage(
          {
            type: 'GET_MATH_ACADEMY_IDS_RESPONSE',
            studentId: win.studentId ?? null,
            courseId: win.courseId ?? null,
          },
          '*'
        );
      }
    });
  },
});
