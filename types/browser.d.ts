import 'wxt/browser';

declare module 'wxt/browser' {
  interface WxtRuntime {
    getURL(path: '/stats.html'): string;
    getURL(path: '/frontier.html'): string;
    getURL(path: '/histograms.html'): string;
  }
}
