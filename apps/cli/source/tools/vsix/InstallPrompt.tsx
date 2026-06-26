import React, {useMemo, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import Spinner from 'ink-spinner';
import {
	type EditorCli,
	findEditorClis,
	getEditorLabel,
	installVsixToEditors,
} from './install.js';

type Props = {
	vsixPath: string;
	onDone: (message: string, success: boolean) => void;
};

type Phase = 'select' | 'installing';

export default function InstallPrompt({vsixPath, onDone}: Props) {
	const editors = useMemo(() => findEditorClis(), []);

	const [phase, setPhase] = useState<Phase>('select');
	const [cursorIndex, setCursorIndex] = useState(0);
	const [selected, setSelected] = useState<Set<EditorCli>>(
		() => new Set(editors),
	);
	const [installingEditor, setInstallingEditor] = useState<EditorCli | null>(
		null,
	);

	async function submit() {
		const chosen = editors.filter(editor => selected.has(editor));

		if (chosen.length === 0) {
			onDone('已跳过安装', true);
			return;
		}

		setPhase('installing');

		const result = await installVsixToEditors(chosen, vsixPath, editor => {
			setInstallingEditor(editor);
		});

		onDone(result.message, result.success);
	}

	useInput(
		(input, key) => {
			if (key.upArrow) {
				setCursorIndex(index => (index - 1 + editors.length) % editors.length);
				return;
			}

			if (key.downArrow) {
				setCursorIndex(index => (index + 1) % editors.length);
				return;
			}

			if (input === ' ') {
				const editor = editors[cursorIndex];
				if (!editor) {
					return;
				}

				setSelected(current => {
					const next = new Set(current);
					if (next.has(editor)) {
						next.delete(editor);
					} else {
						next.add(editor);
					}

					return next;
				});
				return;
			}

			if (key.return) {
				void submit();
			}
		},
		{isActive: phase === 'select' && editors.length > 0},
	);

	if (phase === 'installing' && installingEditor) {
		return (
			<Box marginTop={1}>
				<Text color="yellow">
					<Spinner type="dots" /> 正在安装到 {getEditorLabel(installingEditor)}…
				</Text>
			</Box>
		);
	}

	if (editors.length === 0) {
		return (
			<Box marginTop={1} flexDirection="column">
				<Text color="yellow">未找到 cursor 或 code 命令，请手动安装</Text>
			</Box>
		);
	}

	return (
		<Box marginTop={1} flexDirection="column">
			<Text>选择要安装到的编辑器：</Text>
			<Box marginTop={1} flexDirection="column">
				{editors.map((editor, index) => {
					const isCursor = index === cursorIndex;
					const isSelected = selected.has(editor);
					return (
						<Text key={editor} color={isCursor ? 'cyan' : undefined}>
							{isCursor ? '❯ ' : '  '}
							{isSelected ? '◉' : '◯'} {getEditorLabel(editor)}
						</Text>
					);
				})}
			</Box>
			<Box marginTop={1}>
				<Text dimColor>↑/↓ 移动 · 空格 选择 · Enter 确认（不选则跳过）</Text>
			</Box>
		</Box>
	);
}
