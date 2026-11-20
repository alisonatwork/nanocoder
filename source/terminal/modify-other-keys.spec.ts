import test from 'ava';
import {rewriteModifyOtherKeys} from './modify-other-keys';

const ESC = '\u001b';

// The sequences each terminal sends for Shift+Enter / Alt+Enter, and what
// they must become so Ink 8 can parse them. Modifier numbering is identical
// between xterm modifyOtherKeys and kitty CSI-u (1 + bitmask): 2 is Shift,
// 3 is Alt.
const CASES: Array<[string, string, string]> = [
	['xterm modifyOtherKeys Shift+Enter', `${ESC}[27;2;13~`, `${ESC}[13;2u`],
	['xterm modifyOtherKeys Alt+Enter', `${ESC}[27;3;13~`, `${ESC}[13;3u`],
];

for (const [label, input, expected] of CASES) {
	test(`${label} becomes the kitty CSI-u form`, t => {
		t.is(rewriteModifyOtherKeys(input), expected);
	});

	test(`${label} is rewritten mid-chunk, not just alone`, t => {
		t.is(rewriteModifyOtherKeys(`a${input}b`), `a${expected}b`);
	});

	test(`${label} does not affect the rest of a chunk`, t => {
		const chunk = `${ESC}[D${input}typed`;
		t.is(rewriteModifyOtherKeys(chunk), `${ESC}[D${expected}typed`);
	});
}

test('every Enter chord in one chunk is rewritten', t => {
	const chunk = `${ESC}[27;2;13~x${ESC}[27;3;13~`;
	t.is(rewriteModifyOtherKeys(chunk), `${ESC}[13;2ux${ESC}[13;3u`);
});

test('an unmodified xterm Enter is left alone', t => {
	// Bare Enter has no 27;…;13~ form — a plain \r stays \r.
	t.is(rewriteModifyOtherKeys('\r'), '\r');
});

test('Ctrl+Enter in modifyOtherKeys form is not rewritten', t => {
	// Modifier 5 is Ctrl. Rewriting it would hand a chord that currently does
	// nothing to the submit path as Ctrl+Return.
	t.is(rewriteModifyOtherKeys(`${ESC}[27;5;13~`), `${ESC}[27;5;13~`);
});

test('other modifyOtherKeys codepoints pass through untouched', t => {
	// Only Enter is rewritten: every other key needs its own reasoning about
	// what modified versions should mean.
	t.is(rewriteModifyOtherKeys(`${ESC}[27;2;9~`), `${ESC}[27;2;9~`);
	t.is(rewriteModifyOtherKeys(`${ESC}[27;5;99~`), `${ESC}[27;5;99~`);
});

test('text without a 27; prefix is returned unchanged', t => {
	const text = `${ESC}[13;2u${ESC}[Dhello\r`;
	t.is(rewriteModifyOtherKeys(text), text);
});

test('a sequence split across reads is not completed', t => {
	// The half-sequence arriving in the second chunk has no 27;…;13~ form to
	// match, and must not be mutated into one.
	t.is(rewriteModifyOtherKeys(`${ESC}[27;2;`), `${ESC}[27;2;`);
	t.is(rewriteModifyOtherKeys('13~'), '13~');
});

test('rewriting is idempotent', t => {
	const once = rewriteModifyOtherKeys(`a${ESC}[27;2;13~b`);
	t.is(rewriteModifyOtherKeys(once), once);
});
