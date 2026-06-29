import React from 'react';
import {Box, Text} from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import {Badge} from '../../components/ui/badge';
import {version} from '../version';

export function Banner() {
	return (
		<Box flexDirection="column">
			<Gradient name="vice">
				<BigText text="vkit" font="block" />
			</Gradient>
			<Box marginBottom={1}>
				<Text dimColor>Your terminal dev toolbox</Text>
				<Box marginLeft={2}>
					<Badge variant="info">{`v${version}`}</Badge>
				</Box>
			</Box>
		</Box>
	);
}
