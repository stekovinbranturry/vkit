import test from 'ava';
import {runVsixDownload} from './source/tools/vsix/download';

test('runVsixDownload rejects unparseable input', async t => {
	const result = await runVsixDownload({input: 'not-valid'});
	t.false(result.success);
	t.regex(result.message, /无法解析/);
});
