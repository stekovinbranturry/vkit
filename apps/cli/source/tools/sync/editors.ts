import {execa, execaSync} from 'execa';
import type {EditorCli} from '../vsix/install';

export type InstalledExtension = {
	id: string;
	version?: string;
};

function parseExtensions(stdout: string): InstalledExtension[] {
	return stdout
		.split('\n')
		.map(line => line.trim())
		.filter(Boolean)
		.map(line => {
			const at = line.lastIndexOf('@');
			if (at <= 0) {
				return {id: line};
			}

			return {id: line.slice(0, at), version: line.slice(at + 1)};
		});
}

export function listInstalledExtensions(editor: EditorCli): InstalledExtension[] {
	const result = execaSync(editor, ['--list-extensions', '--show-versions'], {
		reject: false,
	});

	const stdout = typeof result.stdout === 'string' ? result.stdout : '';

	if (result.failed || !stdout) {
		return [];
	}

	return parseExtensions(stdout);
}

export async function listInstalledExtensionsAsync(
	editor: EditorCli,
): Promise<InstalledExtension[]> {
	const result = await execa(
		editor,
		['--list-extensions', '--show-versions'],
		{reject: false},
	);

	const stdout = typeof result.stdout === 'string' ? result.stdout : '';

	if (result.failed || !stdout) {
		return [];
	}

	return parseExtensions(stdout);
}
