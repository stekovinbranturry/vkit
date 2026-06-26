import React, {useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import {tools} from './registry';
import VsixApp from './vsix/VsixApp';
import SyncApp from './sync/SyncApp';
import KeyHints from '../components/KeyHints';

function Indicator({isSelected}: {isSelected?: boolean}) {
	return <Text color="cyan">{isSelected ? '❯' : ' '} </Text>;
}

function Item({isSelected, label}: {isSelected?: boolean; label: string}) {
	return (
		<Text>
			<Text color={isSelected ? 'cyan' : 'gray'}>◆ </Text>
			<Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
				{label}
			</Text>
		</Text>
	);
}

export default function Dashboard() {
	const {exit} = useApp();
	const [activeTool, setActiveTool] = useState<string | null>(null);
	const availableTools = tools.filter(tool => tool.available);
	const [highlightedId, setHighlightedId] = useState(
		availableTools[0]?.id ?? '',
	);

	useInput((input, key) => {
		if (input === 'q' || (key.ctrl && input === 'c')) {
			exit();
		}
	});

	if (activeTool === 'vsix-downloader') {
		return <VsixApp onBack={() => setActiveTool(null)} />;
	}

	if (activeTool === 'sync-to-cursor') {
		return <SyncApp onBack={() => setActiveTool(null)} />;
	}

	const items = availableTools.map(tool => ({
		label: tool.name,
		value: tool.id,
	}));

	const highlightedTool = availableTools.find(tool => tool.id === highlightedId);

	return (
		<Box flexDirection="column">
			<Gradient name="vice">
				<BigText text="vkit" font="block" />
			</Gradient>
			<Box>
				<Text dimColor>Your terminal dev toolbox</Text>
			</Box>
			<Text dimColor>{'─'.repeat(36)}</Text>
			<Box marginTop={1}>
				<SelectInput
					items={items}
					indicatorComponent={Indicator}
					itemComponent={Item}
					onHighlight={item => setHighlightedId(item.value)}
					onSelect={item => setActiveTool(item.value)}
				/>
			</Box>
			{highlightedTool?.description ? (
				<Box marginTop={0.5} paddingLeft={4}>
					<Text dimColor>{highlightedTool.description}</Text>
				</Box>
			) : null}
			<Box marginTop={1}>
				<KeyHints
					items={[
						{key: '↑↓', label: '选择'},
						{key: '↵', label: '进入'},
						{key: 'q', label: '退出'},
					]}
				/>
			</Box>
		</Box>
	);
}
