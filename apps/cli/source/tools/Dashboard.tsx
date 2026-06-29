import React, {useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import {tools} from './registry';
import VsixApp from './vsix/VsixApp';
import SyncApp from './sync/SyncApp';
import {Banner} from '../components/Banner';
import {Divider} from '../../components/ui/divider';
import {KeyHint} from '../../components/ui/key-hint';

const PANEL_WIDTH = 44;

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
		return (
			<Box flexDirection="column">
				<Banner />
				<VsixApp onBack={() => setActiveTool(null)} />
			</Box>
		);
	}

	if (activeTool === 'sync-to-cursor') {
		return (
			<Box flexDirection="column">
				<Banner />
				<SyncApp onBack={() => setActiveTool(null)} />
			</Box>
		);
	}

	const items = availableTools.map(tool => ({
		label: tool.name,
		value: tool.id,
	}));

	const highlightedTool = availableTools.find(tool => tool.id === highlightedId);

	return (
		<Box flexDirection="column">
			<Banner />
			<Divider width={PANEL_WIDTH} />
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
				<Box marginTop={1} paddingLeft={4}>
					<Text dimColor>{highlightedTool.description}</Text>
				</Box>
			) : null}
			<Box marginTop={1}>
				<Divider width={PANEL_WIDTH} />
			</Box>
			<Box marginTop={1}>
				<KeyHint keys={[
						{key: '↑↓', label: '选择'},
						{key: '↵', label: '进入'},
						{key: 'q', label: '退出'},
					]}
				/>
			</Box>
		</Box>
	);
}
