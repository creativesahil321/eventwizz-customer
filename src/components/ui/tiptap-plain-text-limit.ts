import { Extension } from "@tiptap/react";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { countWords } from "@/lib/word-count";

/**
 * Transaction meta for programmatic loads (saved value, AI output). Those must
 * render even when over the cap so the vendor can see and trim the text.
 */
export const PLAIN_TEXT_LIMIT_BYPASS_META = "plainTextLimitBypass";

export type PlainTextLimits = {
  enabled: boolean;
  maxChars: number;
  maxWords: number;
};

type Options = {
  /** Read on every transaction so prop changes apply without rebuilding the editor. */
  getLimits: () => PlainTextLimits;
};

function measure(doc: ProseMirrorNode) {
  const plain = doc
    .textBetween(0, doc.content.size, " ", " ")
    .replace(/\s+/g, " ")
    .trim();
  return { chars: plain.length, words: countWords(plain) };
}

/** Growth past a cap is rejected; edits that shrink an over-limit doc still pass. */
function exceedsLimits(
  before: ProseMirrorNode,
  after: ProseMirrorNode,
  { maxChars, maxWords }: PlainTextLimits,
): boolean {
  const prev = measure(before);
  const next = measure(after);
  const charsOver = maxChars > 0 && next.chars > maxChars && next.chars > prev.chars;
  const wordsOver = maxWords > 0 && next.words > maxWords && next.words > prev.words;
  return charsOver || wordsOver;
}

function fitPastedText(
  state: EditorState,
  text: string,
  limits: PlainTextLimits,
): Transaction | null {
  let candidate = text.replace(/\s+/g, " ");
  if (limits.maxChars > 0) {
    const { chars } = measure(state.doc);
    const selected = state.doc
      .textBetween(state.selection.from, state.selection.to, " ")
      .length;
    const room = Math.max(0, limits.maxChars - chars + selected);
    candidate = candidate.slice(0, room);
  }
  while (candidate) {
    const tr = state.tr.insertText(candidate);
    if (!exceedsLimits(state.doc, tr.doc, limits)) return tr;
    const trimmed = candidate.replace(/\s*\S+\s*$/, "");
    candidate = trimmed === candidate ? "" : trimmed;
  }
  return null;
}

export function createPlainTextLimitPlugin(
  getLimits: Options["getLimits"],
): Plugin {
  return new Plugin({
    key: new PluginKey("plainTextLimit"),
    filterTransaction: (tr, state) => {
      const limits = getLimits();
      if (!limits.enabled || !tr.docChanged) return true;
      if (tr.getMeta(PLAIN_TEXT_LIMIT_BYPASS_META)) return true;
      return !exceedsLimits(state.doc, tr.doc, limits);
    },
    props: {
      handlePaste: (view, event) => {
        const limits = getLimits();
        if (!limits.enabled) return false;
        const text = event.clipboardData?.getData("text/plain") ?? "";
        if (!text) return false;
        const tr = fitPastedText(view.state, text, limits);
        if (tr) view.dispatch(tr.scrollIntoView());
        return true;
      },
    },
  });
}

/**
 * Hard stop at the editor's caps: typing and pasting stop at the limit instead
 * of letting text through and flagging or clipping it afterwards.
 */
export const PlainTextLimit = Extension.create<Options>({
  name: "plainTextLimit",

  addOptions() {
    return {
      getLimits: () => ({ enabled: false, maxChars: 0, maxWords: 0 }),
    };
  },

  addProseMirrorPlugins() {
    return [createPlainTextLimitPlugin(this.options.getLimits)];
  },
});
