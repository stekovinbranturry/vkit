export {
  parseExtensionInput,
  resolveExtension,
  buildDownloadUrl,
  buildVsixFilename,
} from '@v-kit/core';
export type {ExtensionRef, ResolvedExtension} from '@v-kit/core';

/**
 * Triggers the download via chrome.downloads, with an anchor-click dev fallback.
 */
export function downloadVsix(
  url: string,
  filename: string,
  saveAs: boolean,
): Promise<number | void> {
  const chromeApi = (globalThis as {chrome?: typeof chrome}).chrome;
  if (chromeApi?.downloads?.download) {
    return new Promise((resolve, reject) => {
      chromeApi.downloads.download({url, filename, saveAs}, (id) => {
        const err = chromeApi.runtime?.lastError;
        if (err) reject(new Error(err.message));
        else resolve(id);
      });
    });
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return Promise.resolve();
}
