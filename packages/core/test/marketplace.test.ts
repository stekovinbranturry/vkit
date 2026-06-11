import test from 'ava';
import {
  parseExtensionInput,
  buildDownloadUrl,
  buildVsixFilename,
} from '../src/marketplace.js';

test('parseExtensionInput accepts publisher.extension', t => {
  t.deepEqual(parseExtensionInput('ms-python.python'), {
    publisher: 'ms-python',
    name: 'python',
  });
});

test('parseExtensionInput accepts marketplace URL', t => {
  t.deepEqual(
    parseExtensionInput(
      'https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode',
    ),
    {publisher: 'esbenp', name: 'prettier-vscode'},
  );
});

test('parseExtensionInput rejects invalid input', t => {
  t.is(parseExtensionInput('invalid'), null);
  t.is(parseExtensionInput(''), null);
});

test('buildDownloadUrl and buildVsixFilename', t => {
  const ref = {publisher: 'ms-python', name: 'python'};
  t.is(
    buildDownloadUrl(ref, '2024.20.0'),
    'https://marketplace.visualstudio.com/_apis/public/gallery/publishers/ms-python/vsextensions/python/2024.20.0/vspackage',
  );
  t.is(buildVsixFilename(ref, '2024.20.0'), 'ms-python.python-2024.20.0.vsix');
});
