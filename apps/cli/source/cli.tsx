#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import ora from 'ora';
import App from './app.js';
import {runVsixDownload} from './tools/vsix/download.js';
import {promptInstallVsix} from './tools/vsix/prompt-install.js';
import {
	printVsixError,
	printVsixHeader,
	printVsixSuccess,
} from './tools/vsix/print-summary.js';
import VsixApp from './tools/vsix/VsixApp.js';

const cli = meow(
	`
	Usage
	  $ vtools
	  $ vtools vsix <extension>
	  $ vtools vsix

	Options
	  --version  Extension version (default: latest from Marketplace)
	  --out      Output file or directory (default: ~/Downloads)

	Examples
	  $ vtools
	  $ vtools vsix ms-python.python
	  $ vtools vsix ms-python.python --version 2024.20.0 --out ./extensions/
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

const [command, extension] = cli.input;

async function runScriptMode() {
	if (!extension) {
		console.error('Usage: vtools vsix <extension>');
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
} else if (command) {
	console.error(`Unknown command: ${command}`);
	process.exit(1);
} else {
	render(<App />);
}
