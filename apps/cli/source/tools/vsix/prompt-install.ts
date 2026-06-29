import {checkbox} from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import {
	type EditorCli,
	findEditorClis,
	getEditorLabel,
	installVsixToEditors,
} from './install';

export async function promptInstallVsix(vsixPath: string): Promise<void> {
	const editors = findEditorClis();

	if (editors.length === 0) {
		console.log(
			chalk.yellow('\n  ⚠ 未找到 cursor 或 code 命令，请手动安装插件\n'),
		);
		return;
	}

	const selected = await checkbox<EditorCli>({
		message: '选择要安装到的编辑器（空格切换，Enter 确认）',
		choices: editors.map(editor => ({
			name: getEditorLabel(editor),
			value: editor,
			checked: true,
		})),
	});

	if (selected.length === 0) {
		console.log(chalk.dim('\n  已跳过安装\n'));
		return;
	}

	const spinner = ora({color: 'cyan', text: '准备安装…'}).start();

	const result = await installVsixToEditors(selected, vsixPath, editor => {
		spinner.text = `正在安装到 ${getEditorLabel(editor)}…`;
	});

	if (result.success) {
		spinner.succeed(result.message);
		console.log();
		return;
	}

	spinner.fail('部分安装失败');
	console.log(chalk.red(`\n  ${result.message}\n`));
}
