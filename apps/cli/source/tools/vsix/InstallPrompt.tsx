import React, {useMemo, useState} from 'react';
import {Box, Text} from 'ink';
import Spinner from 'ink-spinner';
import {Divider} from '../../../components/ui/divider';
import {KeyHint} from '../../../components/ui/key-hint';
import {useMultiSelectList} from '../../hooks/useMultiSelectList';
import {
	type EditorCli,
	findEditorClis,
	getEditorLabel,
	installVsixToEditors,
} from './install';

type Props = {
	vsixPath: string;
	onDone: (message: string, success: boolean) => void;
};

type Phase = 'select' | 'installing';

export default function InstallPrompt({vsixPath, onDone}: Props) {
	const editors = useMemo(() => findEditorClis(), []);

	const [phase, setPhase] = useState<Phase>('select');
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

	const list = useMultiSelectList({
		items: editors,
		getKey: editor => editor,
		setSelected,
		isActive: phase === 'select' && editors.length > 0,
		onSubmit: () => {
			void submit();
		},
		onCancel: () => {
			onDone('已跳过安装', true);
		},
	});

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
					const isCursor = list.isCursor(index);
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
				<Divider width={40} />
			</Box>
			<Box>
				<KeyHint
					keys={[
						{key: '↑↓', label: '移动'},
						{key: '空格', label: '选择'},
						{key: 'a', label: '全选'},
						{key: '↵', label: '安装'},
						{key: 'Esc', label: '跳过'},
					]}
				/>
			</Box>
		</Box>
	);
}
