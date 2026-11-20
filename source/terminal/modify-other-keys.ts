/**
 * xterm's modifyOtherKeys encoding of Enter with a modifier is
 * `\x1b[27;<mods>;13~` — what xterm.js (the VS Code integrated terminal, and
 * anything embedding it) sends for Shift+Enter and Alt+Enter. Ink 8's keypress
 * parser does not recognise that form at all: `parseKeypress` returns an empty
 * key name, and its input loop then drops the sequence entirely rather than
 * leaking it into the prompt.
 *
 * The kitty CSI-u encoding of the same chord, `\x1b[13;<mods>u`, *is* parsed
 * natively — Ink maps it to `key.return` with `key.shift`/`key.meta` — and
 * flows through the existing newline predicate unchanged. Both encodings
 * number modifiers identically (`1 + bitmask`), so the rewrite is a field
 * swap: codepoint moves from last parameter to first, `~` becomes `u`.
 *
 * Only Shift (2) and Alt (3) + Enter are rewritten, deliberately matching the
 * sequences this app treats as newline: Ctrl+Enter is not one, and rewriting
 * it would turn a no-op into a submit. Other keys are left untouched — each
 * addition needs the same reasoning about what its modifiers should mean.
 *
 * Runs in the stdin proxy (see cli.tsx) before the chunk is split into
 * keypresses, so translated and untouched sequences coexist in one chunk.
 * A sequence split across two stdin reads is not rewritten; Ink drops it, as
 * it does every other unrecognised complete sequence.
 */
const MODIFY_OTHER_KEYS_ENTER = /\u001b\[27;([23]);13~/g;

export function rewriteModifyOtherKeys(text: string): string {
	if (!text.includes('\u001b[27;')) {
		return text;
	}

	return text.replace(
		MODIFY_OTHER_KEYS_ENTER,
		(_match, modifier: string) => `\u001b[13;${modifier}u`,
	);
}
