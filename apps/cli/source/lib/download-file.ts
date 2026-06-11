import {createWriteStream} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';

export async function downloadVsixToFile(
	url: string,
	destPath: string,
): Promise<void> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`下载失败（HTTP ${response.status}）`);
	}

	if (!response.body) {
		throw new Error('下载失败：响应体为空');
	}

	await mkdir(path.dirname(destPath), {recursive: true});

	const nodeStream = Readable.fromWeb(
		response.body as Parameters<typeof Readable.fromWeb>[0],
	);
	await pipeline(nodeStream, createWriteStream(destPath));
}
