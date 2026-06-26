import {stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {
	parseExtensionInput,
	resolveExtension,
	buildDownloadUrl,
	buildVsixFilename,
} from '@v-kit/core';
import {downloadVsixToFile} from '../../lib/download-file.js';

export type DownloadOptions = {
	input: string;
	version?: string;
	out?: string;
	onStatus?: (message: string) => void;
};

export type DownloadResult = {
	success: boolean;
	message: string;
	filePath?: string;
	filename?: string;
	fileSize?: number;
	extension?: {
		id: string;
		displayName: string;
		version: string;
		publisher: string;
	};
};

const DEFAULT_DOWNLOAD_DIR = path.join(homedir(), 'Downloads');

function resolveDestPath(out: string | undefined, filename: string): string {
	if (!out) {
		return path.join(DEFAULT_DOWNLOAD_DIR, filename);
	}

	if (path.extname(out) === '.vsix') {
		return path.resolve(out);
	}

	return path.join(path.resolve(out), filename);
}

export async function runVsixDownload(
	options: DownloadOptions,
): Promise<DownloadResult> {
	const {input, version, out, onStatus} = options;
	const ref = parseExtensionInput(input);

	if (!ref) {
		return {
			success: false,
			message:
				'无法解析输入。请使用 "publisher.extension" 或完整的 Marketplace 链接。',
		};
	}

	try {
		let resolvedVersion = version?.trim() ?? '';
		let label = `${ref.publisher}.${ref.name}`;

		if (!resolvedVersion) {
			onStatus?.('正在查询最新版本……');
			const resolved = await resolveExtension(ref);
			resolvedVersion = resolved.version;
			if (resolved.displayName) {
				label = resolved.displayName;
			}
		}

		const url = buildDownloadUrl(ref, resolvedVersion);
		const filename = buildVsixFilename(ref, resolvedVersion);
		const destPath = resolveDestPath(out, filename);

		onStatus?.(`正在下载 ${label} v${resolvedVersion} …`);
		await downloadVsixToFile(url, destPath);

		const {size} = await stat(destPath);

		return {
			success: true,
			message: `已保存：${destPath}`,
			filePath: destPath,
			filename,
			fileSize: size,
			extension: {
				id: `${ref.publisher}.${ref.name}`,
				displayName: label,
				version: resolvedVersion,
				publisher: ref.publisher,
			},
		};
	} catch (error) {
		return {
			success: false,
			message: error instanceof Error ? error.message : '下载失败，请重试。',
		};
	}
}
