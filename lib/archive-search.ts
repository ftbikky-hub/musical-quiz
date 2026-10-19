/** 表記の全半角・英字の大小・かな・名前内の空白を揃える。 */
export function normalizeArchiveSearch(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ja")
    .replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .replace(/\s+/gu, "");
}

export function matchesArchiveSearch(text: string, query: string): boolean {
  const target = normalizeArchiveSearch(text);
  const terms = query.normalize("NFKC").trim().split(/\s+/u).filter(Boolean);
  return terms.every((term) => target.includes(normalizeArchiveSearch(term)));
}
