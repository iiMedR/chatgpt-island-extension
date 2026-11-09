import { readFileSync } from 'node:fs';
const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as {
  version: string;
};
export const manifest: chrome.runtime.ManifestV3 = {
  manifest_version: 3,
  name: 'ChatGPT Island',
  version,
  version_name: `${version} Developer Preview`,
  description:
    'Developer preview: explore selected ChatGPT text in a floating AI chat. Requires a local backend and paid API setup.',
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  permissions: ['activeTab'],
  host_permissions: ['http://127.0.0.1/*'],
  commands: {
    'open-island': {
      suggested_key: { default: 'Alt+Shift+E' },
      description: 'Explore the last selected assistant text',
    },
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  },
  background: { service_worker: 'background.js', type: 'module' },
  content_scripts: [
    {
      matches: ['https://chatgpt.com/*'],
      js: ['content.js'],
      run_at: 'document_idle',
    },
  ],
};
