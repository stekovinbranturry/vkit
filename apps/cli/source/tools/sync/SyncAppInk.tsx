import React, {useEffect, useMemo, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import Spinner from 'ink-spinner';
import {findEditorClis, getEditorLabel} from '../vsix/install';
import {MultiSelect} from '../../../components/ui/multi-select';
import {ProgressBar} from '../../../components/ui/progress-bar';
import {KeyHint} from '../../../components/ui/key-hint';
import {
	cleanupTempDir,
	computeSyncCandidatesAsync,
	createTempDir,
	syncExtension,
	type SyncCandidate,
	type SyncItemResult,
} from './sync';

const SOURCE = 'code' as const;
const TARGET = 'cursor' as const;

type Phase = 'loading' | 'select' | 'confirm' | 'syncing' | 'done' | 'error';

type Props = {
	onBack: () => void;
};

// PoC: 同一个同步功能，select/syncing/提示全部改用 InkUI 组件，用于对比手搓版。
export default function SyncAppInk({onBack}: Props) {
	const [phase, setPhase] = useState<Phase>('loading');
	const [candidates, setCandidates] = useState<SyncCandidate[]>([]);
	const [errorMessage, setErrorMessage] = useState('');
	const [chosen, setChosen] = useState<SyncCandidate[]>([]);
	const [progress, setProgress] = useState({current: 0, total: 0});
	const [status, setStatus] = useState('');
	const [results, setResults] = useState<SyncItemResult[]>([]);

	const installable = useMemo(
		() => candidates.filter(c => !c.installedInTarget),
		[candidates],
	);
	const installed = useMemo(
		() => candidates.filter(c => c.installedInTarget),
		[candidates],
	);

	useEffect(() => {
		let cancelled = false;

		void (async () => {
			const editors = findEditorClis();

			if (!editors.includes(SOURCE)) {
				setErrorMessage(
					'未找到 code 命令。请在 VS Code 中执行「Shell Command: Install \'code\' command in PATH」。',
				);
				setPhase('error');
				return;
			}

			if (!editors.includes(TARGET)) {
				setErrorMessage(
					'未找到 cursor 命令。请在 Cursor 中执行「Shell Command: Install \'cursor\' command in PATH」。',
				);
				setPhase('error');
				return;
			}

			try {
				const found = await computeSyncCandidatesAsync(SOURCE, TARGET);
				if (cancelled) {
					return;
				}

				if (found.length === 0) {
					setErrorMessage('VS Code 没有检测到已安装的扩展。');
					setPhase('error');
					return;
				}

				const missing = found.filter(c => !c.installedInTarget);
				if (missing.length === 0) {
					setErrorMessage(
						`${getEditorLabel(TARGET)} 已拥有 ${getEditorLabel(SOURCE)} 的全部扩展，无需同步。`,
					);
					setPhase('error');
					return;
				}

				setCandidates(found);
				setPhase('select');
			} catch (error) {
				if (cancelled) {
					return;
				}

				setErrorMessage(
					error instanceof Error ? error.message : String(error),
				);
				setPhase('error');
			}
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	// 已安装项 disabled 灰显，可同步项可勾选，默认全选可同步项。
	const items = useMemo(
		() =>
			candidates.map(c => ({
				label: c.installedInTarget ? `${c.id}  （已在 Cursor）` : c.id,
				value: c.id,
				disabled: c.installedInTarget,
			})),
		[candidates],
	);
	const defaultSelected = useMemo(
		() => installable.map(c => c.id),
		[installable],
	);

	async function runSync(toSync: SyncCandidate[]) {
		setPhase('syncing');
		setProgress({current: 0, total: toSync.length});

		const tmpDir = await createTempDir();
		const collected: SyncItemResult[] = [];

		try {
			for (let i = 0; i < toSync.length; i++) {
				const candidate = toSync[i]!;
				setProgress({current: i + 1, total: toSync.length});
				setStatus(`正在下载 ${candidate.id} …`);

				// eslint-disable-next-line no-await-in-loop
				const result = await syncExtension(
					candidate.id,
					TARGET,
					tmpDir,
					message => setStatus(message),
				);
				collected.push(result);
			}
		} finally {
			await cleanupTempDir(tmpDir);
		}

		setResults(collected);
		setPhase('done');
	}

	useInput((input, key) => {
		if (phase === 'loading') {
			if (key.escape || input === 'q') {
				onBack();
			}

			return;
		}

		if (phase === 'select') {
			// MultiSelect 自己处理上下/空格/回车，这里只补一个返回键。
			if (key.escape) {
				onBack();
			}

			return;
		}

		if (phase === 'confirm') {
			if (key.return) {
				void runSync(chosen);
				return;
			}

			if (key.escape || input === 'q') {
				setPhase('select');
			}

			return;
		}

		if (phase === 'done' || phase === 'error') {
			if (key.return || input === 'q' || key.escape) {
				onBack();
			}
		}
	});

	if (phase === 'loading') {
		return (
			<Box flexDirection="column">
				<Text bold>同步扩展到 Cursor（InkUI PoC）</Text>
				<Text dimColor>{'─'.repeat(34)}</Text>
				<Box marginTop={1}>
					<Text color="yellow">
						<Spinner type="dots" /> 正在读取 {getEditorLabel(SOURCE)} 与{' '}
						{getEditorLabel(TARGET)} 的扩展列表…
					</Text>
				</Box>
			</Box>
		);
	}

	if (phase === 'error') {
		return (
			<Box flexDirection="column">
				<Text bold>同步扩展到 Cursor（InkUI PoC）</Text>
				<Text dimColor>{'─'.repeat(34)}</Text>
				<Box marginTop={1}>
					<Text color="yellow">{errorMessage}</Text>
				</Box>
				<Box marginTop={1}>
					<KeyHint keys={[{key: '↵ / q', label: '返回'}]} />
				</Box>
			</Box>
		);
	}

	if (phase === 'select') {
		return (
			<Box flexDirection="column">
				<Text bold>同步扩展到 Cursor（InkUI PoC）</Text>
				<Text dimColor>{'─'.repeat(34)}</Text>
				<Box>
					<Text>
						<Text color="green">可同步 {installable.length} 个</Text>
						<Text dimColor>
							{' '}· 已在 Cursor {installed.length} 个（灰色不可选）
						</Text>
					</Text>
				</Box>
				<Box marginTop={1}>
					<MultiSelect
						items={items}
						defaultSelected={defaultSelected}
						onSubmit={selected => {
							const ids = new Set(selected.map(s => s.value));
							const picked = installable.filter(c => ids.has(c.id));
							if (picked.length === 0) {
								onBack();
								return;
							}

							setChosen(picked);
							setPhase('confirm');
						}}
					/>
				</Box>
				<Box marginTop={1}>
					<KeyHint
						keys={[
							{key: '↑↓', label: '移动'},
							{key: '空格', label: '选择'},
							{key: '↵', label: '下一步'},
							{key: 'Esc', label: '返回'},
						]}
					/>
				</Box>
			</Box>
		);
	}

	if (phase === 'confirm') {
		const preview = chosen.slice(0, 10);
		return (
			<Box flexDirection="column">
				<Text bold>同步扩展到 Cursor（InkUI PoC）</Text>
				<Text dimColor>{'─'.repeat(34)}</Text>
				<Box marginTop={1}>
					<Text>
						即将新增安装{' '}
						<Text color="green" bold>
							{chosen.length}
						</Text>{' '}
						个扩展到 {getEditorLabel(TARGET)}：
					</Text>
				</Box>
				<Box marginTop={1} flexDirection="column">
					{preview.map(candidate => (
						<Text key={candidate.id} color="green">
							{'  • '}
							{candidate.id}
						</Text>
					))}
					{chosen.length > preview.length ? (
						<Text dimColor>{`  … 还有 ${chosen.length - preview.length} 个`}</Text>
					) : null}
				</Box>
				<Box marginTop={1}>
					<KeyHint
						keys={[
							{key: '↵', label: '确认开始'},
							{key: 'Esc', label: '返回修改'},
						]}
					/>
				</Box>
			</Box>
		);
	}

	if (phase === 'syncing') {
		const pct = progress.total
			? (progress.current / progress.total) * 100
			: 0;
		return (
			<Box flexDirection="column">
				<Text bold>同步扩展到 Cursor（InkUI PoC）</Text>
				<Text dimColor>{'─'.repeat(34)}</Text>
				<Box marginTop={1}>
					<Text>
						同步中（{progress.current}/{progress.total}）
					</Text>
				</Box>
				<Box marginTop={1} width={50}>
					<ProgressBar value={pct} />
				</Box>
				<Box marginTop={1}>
					<Text dimColor>{status}</Text>
				</Box>
			</Box>
		);
	}

	const succeeded = results.filter(r => r.success);
	const failed = results.filter(r => !r.success);

	return (
		<Box flexDirection="column">
			<Text bold>同步扩展到 Cursor（InkUI PoC）</Text>
			<Text dimColor>{'─'.repeat(34)}</Text>
			<Box marginTop={1}>
				<Text color="green">✔ 成功 {succeeded.length} 个</Text>
			</Box>
			{failed.length > 0 ? (
				<Box marginTop={1} flexDirection="column">
					<Text color="red">✖ 失败 {failed.length} 个：</Text>
					{failed.map(item => (
						<Text key={item.id} color="red">
							{'  '}
							{item.id}：{item.message}
						</Text>
					))}
				</Box>
			) : null}
			<Box marginTop={1}>
				<KeyHint keys={[{key: '↵ / q', label: '返回'}]} />
			</Box>
		</Box>
	);
}
