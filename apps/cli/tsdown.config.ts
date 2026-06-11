import {defineConfig} from 'tsdown';

export default defineConfig({
	entry: ['source/cli.tsx'],
	format: ['esm'],
	platform: 'node',
	dts: false,
	clean: true,
	outDir: 'dist',
});
