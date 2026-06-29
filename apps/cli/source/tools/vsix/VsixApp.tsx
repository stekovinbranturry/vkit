import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import InstallPrompt from './InstallPrompt';
import {type DownloadResult, runVsixDownload} from './download';
import {Divider} from '../../../components/ui/divider';
import {StatusIndicator} from '../../../components/ui/status-indicator';
import {KeyHint} from '../../../components/ui/key-hint';

const PANEL_WIDTH = 40;

function Header() {
	return (
		<>
			<Text bold>安装 VS Code / Cursor 插件</Text>
			<Divider width={PANEL_WIDTH} />
		</>
	);
}

type Status = 'idle' | 'working' | 'done' | 'error';

type Phase = 'form' | 'install';

type Props = {
	onBack: () => void;
};

const EXAMPLES = [
	'ms-python.python',
	'esbenp.prettier-vscode',
	'dbaeumer.vscode-eslint',
];

export default function VsixApp({onBack}: Props) {
	const [input, setInput] = useState('');
	const [status, setStatus] = useState<Status>('idle');
	const [message, setMessage] = useState('');
	const [phase, setPhase] = useState<Phase>('form');
	const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(
		null,
	);

	const busy = status === 'working';

	useInput(
		(_input, key) => {
			if (busy || phase === 'install') {
				return;
			}

			if (key.escape) {
				onBack();
			}
		},
		{isActive: !busy && phase === 'form'},
	);

	async function handleSubmit() {
		if (busy) {
			return;
		}

		setStatus('working');
		setMessage('');

		const result = await runVsixDownload({
			input,
			onStatus: setMessage,
		});

		if (result.success && result.filePath) {
			setDownloadResult(result);
			setPhase('install');
			setStatus('done');
			setMessage(result.message);
			return;
		}

		setStatus(result.success ? 'done' : 'error');
		setMessage(result.message);
	}

	if (phase === 'install' && downloadResult?.filePath) {
		return (
			<Box flexDirection="column">
				<Header />
				<Box marginTop={1}>
					<StatusIndicator status="online" label={downloadResult.message} />
				</Box>
				<InstallPrompt
					vsixPath={downloadResult.filePath}
					onDone={(installMessage, success) => {
						setPhase('form');
						setStatus(success ? 'done' : 'error');
						setMessage(installMessage);
					}}
				/>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Header />

			<Box marginTop={1} flexDirection="column">
				<Text>插件名称或 Marketplace 链接</Text>
				<Text color="cyan">
					{'> '}
					{busy ? (
						<Text>{input || 'ms-python.python'}</Text>
					) : (
						<TextInput
							value={input}
							onChange={setInput}
							onSubmit={handleSubmit}
							placeholder="ms-python.python"
						/>
					)}
				</Text>
			</Box>

			<Box marginTop={1}>
				<Text dimColor>示例：</Text>
				<Text dimColor>{EXAMPLES.join(' · ')}</Text>
			</Box>

			{busy ? (
				<Box marginTop={1}>
					<Text color="yellow">
						<Spinner type="dots" /> {message || '处理中…'}
					</Text>
				</Box>
			) : (
				<>
					<Box marginTop={1}>
						<Divider width={PANEL_WIDTH} />
					</Box>
					<Box>
						<KeyHint keys={[
								{key: '↵', label: '安装'},
								{key: 'Esc', label: '返回'},
							]}
						/>
					</Box>
				</>
			)}

			{status !== 'idle' && !busy && (
				<Box marginTop={1}>
					<StatusIndicator
						status={status === 'error' ? 'error' : 'online'}
						label={message}
					/>
				</Box>
			)}
		</Box>
	);
}
