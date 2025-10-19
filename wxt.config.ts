import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    base: './',
  }),
  manifest: {
    name: 'Math Academy Stats',
    description: 'Analyze your Math Academy activity data with statistics, exports to JSON/CSV, and performance insights',
    permissions: ['storage', 'tabs', 'activeTab'],
    host_permissions: ['https://mathacademy.com/*', 'https://www.mathacademy.com/*'],
    content_scripts: [
      {
        matches: ['*://*.mathacademy.com/*', '*://mathacademy.com/*'],
        js: ['content-isolated.js'],
      },
      {
        matches: ['*://*.mathacademy.com/*', '*://mathacademy.com/*'],
        js: ['content-main.js'],
        world: 'MAIN' as any,
      },
    ],
  },
});
