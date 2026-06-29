import React, {useEffect, useMemo, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import Spinner from 'ink-spinner';
import {findEditorClis, getEditorLabel} from '../vsix/install';
import {Divider} from '../../../components/ui/divider';
import {
	StatusIndicator,
	type StatusValue,
} from '../../../components/ui/status-indicator';
import {KeyHint} from '../../../components/ui/key-hint';
import {useMultiSelectList} from '../../hooks/useMultiSelectList';
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
const PANEL_WIDTH = 44;

type Phase = 'loading' | 'select' | 'confirm' | 'syncing' | 'error';

function Header() {
	return (
		<>
			<Text bold>同步插件到 Cursor</Text>
			<Divider width={PANEL_WIDTH} />
		</>
	);
}

// Reserve rows for the persistent banner + header/separator/summary/hint so the
// list never pushes the rest of the UI off a short terminal (which leaves
// confusing stale frames). The banner (big text + subtitle) alone is ~8 rows.
const CHROME_ROWS = 17;
const MIN_VISIBLE = 4;
const MAX_VISIBLE = 14;
const INSTALLED_PREVIEW = 6;

function getVisibleCount(total: number): number {
	const rows = process.stdout.rows ?? 24;
	const fit = rows - CHROME_ROWS;
	return Math.max(MIN_VISIBLE, Math.min(total, MAX_VISIBLE, fit));
}

type ItemStatus = 'pending' | 'downloading' | 'success' | 'error';

const ITEM_STATUS_MAP: Record<ItemStatus, StatusValue> = {
	pending: 'idle',
	downloading: 'loading',
	success: 'online',
	error: 'error',
};

type Props = {
	onBack: () => void;
};

export default function SyncApp({onBack}: Props) {
	const [phase, setPhase] = useState<Phase>('loading');
	const [candidates, setCandidates] = useState<SyncCandidate[]>([]);
	const [errorMessage, setErrorMessage] = useState('');
	const [selected, setSelected] = useState<Set<string>>(() => new Set());
	const [progress, setProgress] = useState({current: 0, total: 0});
	const [status, setStatus] = useState('');
	const [itemStatus, setItemStatus] = useState<Record<string, ItemStatus>>({});
	const [results, setResults] = useState<SyncItemResult[]>([]);
	const [finished, setFinished] = useState(false);

	// Already-installed extensions are shown separately and are NOT selectable.
	// Only the missing ones are interactive.
	const installable = useMemo(
		() => candidates.filter(c => !c.installedInTarget),
		[candidates],
	);
	const installed = useMemo(
		() => candidates.filter(c => c.installedInTarget),
		[candidates],
	);

	const visibleCount = useMemo(
		() => getVisibleCount(installable.length),
		[installable.length],
	);

	// Detection spawns `code`/`cursor --list-extensions`, which is slow. Run it
	// asynchronously so entering the tool stays responsive and shows a spinner.
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
					setErrorMessage('VS Code 没有检测到已安装的插件。');
					setPhase('error');
					return;
				}

				const missing = found.filter(c => !c.installedInTarget);
				if (missing.length === 0) {
					setErrorMessage(
						`${getEditorLabel(TARGET)} 已拥有 ${getEditorLabel(SOURCE)} 的全部插件，无需同步。`,
					);
					setPhase('error');
					return;
				}

				setCandidates(found);
				setSelected(new Set(missing.map(c => c.id)));
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

	const chosen = installable.filter(c => selected.has(c.id));

	async function runSync() {
		setPhase('syncing');
		setFinished(false);
		setProgress({current: 0, total: chosen.length});
		setItemStatus(
			Object.fromEntries(chosen.map(c => [c.id, 'pending' as ItemStatus])),
		);

		const tmpDir = await createTempDir();
		const collected: SyncItemResult[] = [];

		try {
			for (let i = 0; i < chosen.length; i++) {
				const candidate = chosen[i]!;
				setProgress({current: i + 1, total: chosen.length});
				setStatus(`正在下载 ${candidate.id} …`);
				setItemStatus(prev => ({...prev, [candidate.id]: 'downloading'}));

				// eslint-disable-next-line no-await-in-loop
				const result = await syncExtension(
					candidate.id,
					TARGET,
					tmpDir,
					message => setStatus(message),
				);
				collected.push(result);
				setItemStatus(prev => ({
					...prev,
					[candidate.id]: result.success ? 'success' : 'error',
				}));
			}
		} finally {
			await cleanupTempDir(tmpDir);
		}

		setResults(collected);
		setFinished(true);
	}

	const list = useMultiSelectList({
		items: installable,
		getKey: c => c.id,
		setSelected,
		isActive: phase === 'select',
		visibleCount,
		onSubmit: () => {
			if (selected.size === 0) {
				onBack();
				return;
			}

			setPhase('confirm');
		},
		onCancel: onBack,
	});

	useInput(
		(input, key) => {
			if (phase === 'loading') {
				if (key.escape || input === 'q') {
					onBack();
				}

				return;
			}

			if (phase === 'error') {
				if (key.return || input === 'q' || key.escape) {
					onBack();
				}

				return;
			}

			if (phase === 'syncing') {
				if (finished && (key.return || input === 'q' || key.escape)) {
					onBack();
				}

				return;
			}

			if (phase === 'confirm') {
				if (key.return) {
					void runSync();
					return;
				}

				if (key.escape || input === 'q') {
					setPhase('select');
				}
			}
		},
		{isActive: phase !== 'select'},
	);

	if (phase === 'loading') {
		return (
			<Box flexDirection="column">
				<Header />
				<Box marginTop={1}>
					<Text color="yellow">
						<Spinner type="dots" /> 正在读取 {getEditorLabel(SOURCE)} 与{' '}
						{getEditorLabel(TARGET)} 的插件列表…
					</Text>
				</Box>
			</Box>
		);
	}

	if (phase === 'error') {
		return (
			<Box flexDirection="column">
				<Header />
				<Box marginTop={1}>
					<Text color="yellow">{errorMessage}</Text>
				</Box>
				<Box marginTop={1}>
					<Divider width={PANEL_WIDTH} />
				</Box>
				<Box>
					<KeyHint keys={[{key: '↵ / q', label: '返回'}]} />
				</Box>
			</Box>
		);
	}

	if (phase === 'confirm') {
		const preview = chosen.slice(0, 10);
		return (
			<Box flexDirection="column">
				<Header />
				<Box marginTop={1}>
					<Text>
						即将安装{' '}
						<Text color="green" bold>
							{chosen.length}
						</Text>{' '}
						个插件到 {getEditorLabel(TARGET)}：
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
					<Divider width={PANEL_WIDTH} />
				</Box>
				<Box>
					<KeyHint keys={[
							{key: '↵', label: '确认开始'},
							{key: 'Esc', label: '返回修改'},
						]}
					/>
				</Box>
			</Box>
		);
	}

	if (phase === 'syncing') {
		const succeeded = results.filter(r => r.success);
		const failed = results.filter(r => !r.success);

		const visible = getVisibleCount(chosen.length);
		// While running, keep the active item centered. Once finished, anchor to
		// the top so the completed list reads naturally from the start.
		const active = Math.max(0, progress.current - 1);
		let start = finished ? 0 : Math.max(0, active - Math.floor(visible / 2));
		start = Math.min(start, Math.max(0, chosen.length - visible));
		const windowItems = chosen.slice(start, start + visible);

		return (
			<Box flexDirection="column">
				<Header />
				<Box marginTop={1}>
					{finished ? (
						<Text>
							<Text color="green">✓</Text> 安装完成，成功{' '}
							<Text color="green" bold>
								{succeeded.length}
							</Text>{' '}
							个
							{failed.length > 0 ? (
								<Text>
									，失败{' '}
									<Text color="red" bold>
										{failed.length}
									</Text>{' '}
									个
								</Text>
							) : null}
						</Text>
					) : (
						<Text>
							安装中{' '}
							<Text color="cyan" bold>
								{progress.current}
							</Text>
							/{progress.total}
						</Text>
					)}
				</Box>
				<Box marginTop={1} flexDirection="column">
					{start > 0 ? <Text dimColor>↑更多</Text> : null}
					{windowItems.map(candidate => {
						const state = itemStatus[candidate.id] ?? 'pending';
						const label =
							state === 'downloading' && status
								? `${candidate.id}  ${status}`
								: candidate.id;
						return (
							<StatusIndicator
								key={candidate.id}
								status={ITEM_STATUS_MAP[state]}
								label={label}
							/>
						);
					})}
					{start + visible < chosen.length ? (
						<Text dimColor>↓更多</Text>
					) : null}
				</Box>
				{finished && failed.length > 0 ? (
					<Box marginTop={1} flexDirection="column">
						<Text color="red">失败明细：</Text>
						{failed.map(item => (
							<Text key={item.id} color="red">
								{'  '}
								{item.id}：{item.message}
							</Text>
						))}
					</Box>
				) : null}
				{finished ? (
					<>
						<Box marginTop={1}>
							<Divider width={PANEL_WIDTH} />
						</Box>
						<Box>
							<KeyHint keys={[{key: '↵ / q', label: '返回'}]} />
						</Box>
					</>
				) : null}
			</Box>
		);
	}

	const {windowed, scrollOffset, hasMoreAbove, hasMoreBelow} = list;
	const installedPreview = installed.slice(0, INSTALLED_PREVIEW);

	return (
		<Box flexDirection="column">
			<Header />
			<Box>
				<Text>
					可同步{' '}
					<Text color="green" bold>
						{installable.length}
					</Text>{' '}
					个插件
				</Text>
				{hasMoreAbove ? (
					<Box marginLeft={1}>
						<Text dimColor>↑更多</Text>
					</Box>
				) : null}
				{hasMoreBelow ? (
					<Box marginLeft={1}>
						<Text dimColor>↓更多</Text>
					</Box>
				) : null}
			</Box>
			<Box flexDirection="column">
				{windowed.map((candidate, index) => {
					const realIndex = scrollOffset + index;
					const isCursor = list.isCursor(realIndex);
					const isSelected = selected.has(candidate.id);
					return (
						<Text key={candidate.id} color={isCursor ? 'cyan' : undefined}>
							{isCursor ? '❯ ' : '  '}
							{isSelected ? '◉' : '◯'} {candidate.id}
						</Text>
					);
				})}
			</Box>
			{installed.length > 0 ? (
				<Box flexDirection="column" marginTop={1}>
					<Text dimColor>
						已在 {getEditorLabel(TARGET)} （{installed.length} 个 · 跳过）
					</Text>
					{installedPreview.map(candidate => (
						<Text key={candidate.id} dimColor>
							{'  ✓ '}
							{candidate.id}
						</Text>
					))}
					{installed.length > installedPreview.length ? (
						<Text dimColor>{`  … 还有 ${installed.length - installedPreview.length} 个`}</Text>
					) : null}
				</Box>
			) : null}
			<Box marginTop={1}>
				<Text>
					已选{' '}
					<Text color="cyan" bold>
						{selected.size}
					</Text>
					/{installable.length}
				</Text>
			</Box>
			<Box marginTop={1}>
				<Divider width={PANEL_WIDTH} />
			</Box>
			<Box>
				<KeyHint keys={[
						{key: '↑↓', label: '移动'},
						{key: '空格', label: '选择'},
						{key: 'a', label: '全选'},
						{key: '↵', label: '下一步'},
						{key: 'Esc', label: '返回'},
					]}
				/>
			</Box>
		</Box>
	);
}
