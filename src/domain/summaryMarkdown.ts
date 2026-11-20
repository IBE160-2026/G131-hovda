/**
 * En bevisst liten Markdown-tolking for sammendrag (FR-11). Blokker skilles med tomme linjer, en
 * blokk der alle linjene starter med `- `, er en punktliste, og `**…**` innenfor en linje blir fet.
 * Alt annet, også ulukkede `**`, står som tekst. Ren funksjon uten avhengigheter (AD-2).
 */

export type InlineSegment = { kind: "text" | "bold"; text: string };

export type SummaryBlock =
  | { kind: "paragraph"; lines: InlineSegment[][] }
  | { kind: "list"; items: InlineSegment[][] };

const LIST_MARKER = "- ";

/** Deler én linje i tekst og fet tekst. Et `**` uten avslutning vises som det står. */
export function parseInline(line: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let text = "";
  let rest = line;
  for (;;) {
    const start = rest.indexOf("**");
    const end = start < 0 ? -1 : rest.indexOf("**", start + 2);
    if (start < 0 || end < 0) break;
    const bold = rest.slice(start + 2, end);
    if (bold.trim() === "") {
      // `****` eller `** **` er ikke fet tekst. Behold det første `**` og let videre.
      text += rest.slice(0, start + 2);
      rest = rest.slice(start + 2);
      continue;
    }
    text += rest.slice(0, start);
    if (text !== "") segments.push({ kind: "text", text });
    segments.push({ kind: "bold", text: bold });
    text = "";
    rest = rest.slice(end + 2);
  }
  text += rest;
  if (text !== "") segments.push({ kind: "text", text });
  return segments;
}

/** Tolker sammendraget til avsnitt og punktlister. */
export function parseSummaryMarkdown(markdown: string): SummaryBlock[] {
  const blocks: SummaryBlock[] = [];
  const rawBlocks = markdown.replace(/\r\n?/g, "\n").split(/\n[ \t]*\n/);
  for (const raw of rawBlocks) {
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");
    if (lines.length === 0) continue;
    if (lines.every((line) => line.startsWith(LIST_MARKER))) {
      blocks.push({ kind: "list", items: lines.map((line) => parseInline(line.slice(LIST_MARKER.length).trim())) });
    } else {
      blocks.push({ kind: "paragraph", lines: lines.map(parseInline) });
    }
  }
  return blocks;
}
