export const manifest: chrome.runtime.ManifestV3 = {
  manifest_version: 3,
  name: 'ChatGPT Island',
  version: '0.1.0',
  description:
    'Explore selected ChatGPT text in an isolated floating conversation.',
  permissions: ['activeTab'],
  action: { default_popup: 'src/popup/index.html' },
  background: { service_worker: 'background.js', type: 'module' },
  content_scripts: [
    {
      matches: ['https://chatgpt.com/*'],
      js: ['content.js'],
      run_at: 'document_idle',
    },
  ],
};
