/**
 * Text for history entries: initials take the first user-visible character (grapheme) of the
 * given name and the surname, so 𠮷 or an accent written as E + ◌́ stay whole (B12).
 */

const segmenter: Intl.Segmenter | null =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

export function firstGrapheme(text: string): string {
  if (!text) return "";
  if (segmenter) {
    for (const { segment } of segmenter.segment(text)) return segment;
    return "";
  }
  return Array.from(text)[0] ?? "";
}

/** First character of the trimmed given name plus first of the trimmed surname (may be ""). */
export function initialLetters(p: { firstName?: string | null; lastName?: string | null }): string {
  return firstGrapheme(p.firstName?.trim() || "") + firstGrapheme(p.lastName?.trim() || "");
}
