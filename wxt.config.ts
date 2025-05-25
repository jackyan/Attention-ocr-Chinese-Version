import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  manifest: {
    name: 'DeepWiki Extension',
    description: 'Integrates DeepWiki.com documentation with GitHub repositories',
    version: '1.0.0',
    permissions: [
      'activeTab',
      'sidePanel',
      'storage',
      'tabs'
    ],
    host_permissions: [
      'https://github.com/*',
      'https://deepwiki.com/*'
    ],
    action: {
      default_title: 'Open DeepWiki Documentation',
      default_icon: {
        16: '/icon-16.png',
        24: '/icon-24.png',
        48: '/icon-48.png',
        128: '/icon-128.png'
      }
    },
    icons: {
      16: '/icon-16.png',
      24: '/icon-24.png',
      48: '/icon-48.png',
      128: '/icon-128.png'
    }
  },
}); 