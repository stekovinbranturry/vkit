import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {runVsixDownload} from '../vsix/download';
import {installVsix, type EditorCli} from '../vsix/install';
import {
	listInstalledExtensions,
	listInstalledExtensionsAsync,
	type InstalledExtension,
} from './editors';

export type SyncCandidate = {
	id: string;
	sourceVersion?: string;
	installedInTarget: boolean;
};

export type SyncItemResult = {
	id: string;
	success: boolean;
	message: string;
};

function buildCandidates(
	sourceExts: InstalledExtension[],
	targetExts: InstalledExtension[],
): SyncCandidate[] {
	const targetIds = new Set(targetExts.map(ext => ext.id.toLowerCase()));

	const seen = new Set<string>();
	const candidates: SyncCandidate[] = [];

	for (const ext of sourceExts) {
		const key = ext.id.toLowerCase();
		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		candidates.push({
			id: ext.id,
			sourceVersion: ext.version,
			installedInTarget: targetIds.has(key),
		});
	}

	return candidates.sort((a, b) => a.id.localeCompare(b.id));
}

export function computeSyncCandidates(
	source: EditorCli,
	target: EditorCli,
): SyncCandidate[] {
	return buildCandidates(
		listInstalledExtensions(source),
		listInstalledExtensions(target),
	);
}

export async function computeSyncCandidatesAsync(
	source: EditorCli,
	target: EditorCli,
): Promise<SyncCandidate[]> {
	const [sourceExts, targetExts] = await Promise.all([
		listInstalledExtensionsAsync(source),
		listInstalledExtensionsAsync(target),
	]);

	return buildCandidates(sourceExts, targetExts);
}

export async function createTempDir(): Promise<string> {
	return mkdtemp(path.join(tmpdir(), 'vkit-sync-'));
}

export async function cleanupTempDir(dir: string): Promise<void> {
	await rm(dir, {recursive: true, force: true});
}

export async function syncExtension(
	id: string,
	target: EditorCli,
	tmpDir: string,
	onStatus?: (message: string) => void,
): Promise<SyncItemResult> {
	const download = await runVsixDownload({input: id, out: tmpDir, onStatus});

	if (!download.success || !download.filePath) {
		return {id, success: false, message: download.message};
	}

	onStatus?.(`正在安装 ${id} …`);
	const result = await installVsix(target, download.filePath);

	return {id, success: result.success, message: result.message};
}
