export type ExtensionRef = {
  publisher: string;
  name: string;
};

export type ResolvedExtension = ExtensionRef & {
  version: string;
  displayName?: string;
  publisherDisplayName?: string;
};

const MARKETPLACE_ORIGIN = 'https://marketplace.visualstudio.com';

export function parseExtensionInput(raw: string): ExtensionRef | null {
  const input = raw.trim();
  if (!input) {
    return null;
  }

  let itemName = input;

  if (input.includes('itemName=')) {
    try {
      const url = new URL(
        input.startsWith('http') ? input : `https://${input}`,
      );
      const param = url.searchParams.get('itemName');
      if (param) {
        itemName = param;
      }
    } catch {
      const match = input.match(/itemName=([^&\s]+)/);
      if (match) {
        itemName = decodeURIComponent(match[1]!);
      }
    }
  }

  const dot = itemName.indexOf('.');
  if (dot <= 0 || dot === itemName.length - 1) {
    return null;
  }

  const publisher = itemName.slice(0, dot).trim();
  const name = itemName.slice(dot + 1).trim();
  if (!publisher || !name) {
    return null;
  }

  return {publisher, name};
}

type QueryResponse = {
  results?: Array<{
    extensions?: Array<{
      displayName?: string;
      publisher?: {displayName?: string};
      versions?: Array<{version?: string}>;
    }>;
  }>;
};

export async function resolveExtension(
  ref: ExtensionRef,
): Promise<ResolvedExtension> {
  const itemName = `${ref.publisher}.${ref.name}`;

  const body = {
    filters: [
      {
        criteria: [
          {filterType: 8, value: 'Microsoft.VisualStudio.Code'},
          {filterType: 7, value: itemName},
        ],
        pageNumber: 1,
        pageSize: 1,
        sortBy: 0,
        sortOrder: 0,
      },
    ],
    flags: 513,
  };

  const response = await fetch(
    `${MARKETPLACE_ORIGIN}/_apis/public/gallery/extensionquery`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json;api-version=3.0-preview.1',
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(`Marketplace API 请求失败（HTTP ${response.status}）`);
  }

  const data = (await response.json()) as QueryResponse;
  const extension = data.results?.[0]?.extensions?.[0];
  const version = extension?.versions?.[0]?.version;

  if (!extension || !version) {
    throw new Error(`未找到扩展 "${itemName}"，请检查名称是否正确`);
  }

  return {
    ...ref,
    version,
    displayName: extension.displayName,
    publisherDisplayName: extension.publisher?.displayName,
  };
}

export function buildDownloadUrl(ref: ExtensionRef, version: string): string {
  return `${MARKETPLACE_ORIGIN}/_apis/public/gallery/publishers/${ref.publisher}/vsextensions/${ref.name}/${version}/vspackage`;
}

export function buildVsixFilename(ref: ExtensionRef, version: string): string {
  return `${ref.publisher}.${ref.name}-${version}.vsix`;
}
