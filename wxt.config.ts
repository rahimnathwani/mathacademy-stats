import { defineConfig } from 'wxt';
import { MATH_ACADEMY_MATCHES } from './utils/constants';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    base: './',
  }),
  manifest: {
    name: 'Math Academy Stats',
    description:
      'Analyze your Math Academy activity data with statistics, exports to JSON/CSV, and performance insights',
    // unlimitedStorage: years of history can exceed storage.local's 10 MB quota.
    permissions: ['storage', 'unlimitedStorage', 'tabs', 'activeTab'],
    host_permissions: ['https://mathacademy.com/*', 'https://www.mathacademy.com/*'],
    // WXT builds these entrypoints but does not register MAIN-world content
    // scripts in the manifest, so both scripts are registered manually here.
    content_scripts: [
      {
        matches: MATH_ACADEMY_MATCHES,
        js: ['content-isolated.js'],
      },
      {
        matches: MATH_ACADEMY_MATCHES,
        js: ['content-main.js'],
        world: 'MAIN',
      },
    ],
    browser_specific_settings: {
      gecko: {
        id: 'mathacademy-stats@rahim.dev',
        // AMO requires this key; WXT's manifest types don't include it yet,
        // and the spread-cast keeps the rest of the object type-checked.
        ...({
          data_collection_permissions: {
            required: ['none'],
            optional: [],
          },
        } as object),
      },
    },
  },
});
