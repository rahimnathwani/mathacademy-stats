export interface MathAcademyIds {
  studentId: number | null;
  courseId: number | null;
  hostname: string | null;
  error?: string;
}

/**
 * Attempts to send a message to a tab with retry logic
 */
async function sendMessageWithRetry(
  tabId: number,
  message: any,
  maxRetries: number = 3,
  delayMs: number = 200
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await browser.tabs.sendMessage(tabId, message);
      return response;
    } catch (err) {
      // If this is the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw err;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Extracts studentId, courseId, and hostname from the Math Academy page's window context
 * by sending a message to the content script.
 */
export async function getMathAcademyIds(): Promise<MathAcademyIds> {
  try {
    // Try to find any Math Academy tab
    const allTabs = await browser.tabs.query({
      url: ['*://*.mathacademy.com/*', '*://mathacademy.com/*']
    });

    if (!allTabs.length) {
      throw new Error('No Math Academy tab found. Please open Math Academy first.');
    }

    // Try each tab until we get a successful response
    let lastError: Error | null = null;

    for (const tab of allTabs) {
      if (!tab.id || !tab.url) continue;

      try {
        const response = await sendMessageWithRetry(tab.id, {
          type: 'GET_MATH_ACADEMY_IDS'
        });

        // If we got valid IDs, return them with the hostname
        if (response && (response.studentId || response.courseId)) {
          // Extract hostname from the tab URL
          const url = new URL(tab.url);
          const hostname = url.hostname;

          return {
            ...response,
            hostname: (hostname === 'mathacademy.com' || hostname === 'www.mathacademy.com')
              ? hostname
              : 'mathacademy.com'
          };
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Continue to next tab
        continue;
      }
    }

    // If we got here, none of the tabs responded successfully
    throw lastError || new Error('Could not get IDs from any Math Academy tab');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to get Math Academy IDs';

    // Provide a more helpful error message
    let userMessage = errorMessage;
    if (errorMessage.includes('Receiving end does not exist')) {
      userMessage = 'Could not connect to Math Academy page. Please refresh the Math Academy tab and try again.';
    }

    return {
      studentId: null,
      courseId: null,
      hostname: null,
      error: userMessage
    };
  }
}
