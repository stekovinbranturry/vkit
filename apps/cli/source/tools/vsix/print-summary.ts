import chalk from 'chalk';
import {formatBytes} from '../../lib/format';
import type {DownloadResult} from './download';

export function printVsixHeader(): void {
	console.log();
	console.log(chalk.bold.cyan('  📦 VSIX Downloader'));
	console.log(chalk.dim('  ' + '─'.repeat(40)));
	console.log();
}

export function printVsixSuccess(result: DownloadResult): void {
	const extension = result.extension;
	const rows: Array<[string, string]> = [
		['Extension', extension?.displayName ?? '—'],
		['ID', extension?.id ?? '—'],
		['Version', extension?.version ?? '—'],
		['File', result.filename ?? '—'],
	];

	if (result.fileSize !== undefined) {
		rows.push(['Size', formatBytes(result.fileSize)]);
	}

	rows.push(['Saved to', result.filePath ?? '—']);

	const labelWidth = Math.max(...rows.map(([label]) => label.length));

	console.log();
	for (const [label, value] of rows) {
		console.log(
			`  ${chalk.dim(label.padEnd(labelWidth))}  ${chalk.white(value)}`,
		);
	}

	console.log();
}

export function printVsixError(message: string): void {
	console.log();
	console.log(`  ${chalk.red('✖')} ${chalk.red(message)}`);
	console.log();
}
