#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import ora from 'ora';
import App from './app';
import {runVsixDownload} from './tools/vsix/download';
import {promptInstallVsix} from './tools/vsix/prompt-install';
import {
	printVsixError,
	printVsixHeader,
	printVsixSuccess,
} from './tools/vsix/print-summary';
import VsixApp from './tools/vsix/VsixApp';
import SyncApp from './tools/sync/SyncApp';
import {checkForUpdates} from './update-check';

const cli = meow(
	`
	Usage
	  $ vkit
	  $ vkit vsix <extension>
	  $ vkit vsix
	  $ vkit vsix-sync

	Options
	  --version  Extension version (default: latest from Marketplace)
	  --out      Output file or directory (default: ~/Downloads)

	Examples
	  $ vkit
	  $ vkit vsix ms-python.python
	  $ vkit vsix ms-python.python --version 2024.20.0 --out ./extensions/
	  $ vkit vsix-sync
`,
	{
		importMeta: import.meta,
		flags: {
			version: {
				type: 'string',
			},
			out: {
				type: 'string',
			},
		},
	},
);

checkForUpdates();

const [command, extension] = cli.input;

async function runScriptMode() {
	if (!extension) {
		console.error('Usage: vkit vsix <extension>');
		process.exit(1);
	}

	printVsixHeader();

	const spinner = ora({
		color: 'cyan',
		text: '准备下载…',
	}).start();

	const result = await runVsixDownload({
		input: extension,
		version: cli.flags.version,
		out: cli.flags.out,
		onStatus: message => {
			spinner.text = message;
		},
	});

	if (result.success) {
		spinner.succeed('下载完成');
		printVsixSuccess(result);

		if (result.filePath) {
			await promptInstallVsix(result.filePath);
		}

		process.exit(0);
	}

	spinner.fail('下载失败');
	printVsixError(result.message);
	process.exit(1);
}

if (command === 'vsix') {
	if (extension) {
		await runScriptMode();
	} else {
		render(
			<VsixApp
				onBack={() => {
					process.exit(0);
				}}
			/>,
		);
	}
} else if (command === 'vsix-sync') {
	render(
		<SyncApp
			onBack={() => {
				process.exit(0);
			}}
		/>,
	);
} else if (command) {
	console.error(`Unknown command: ${command}`);
	process.exit(1);
} else {
	render(<App />);
}
