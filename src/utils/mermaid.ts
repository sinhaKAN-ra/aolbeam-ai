/**
 * Consolidated Mermaid utilities — single source of truth.
 *
 * Previously the same logic lived (divergently) in both mermaidHelper.ts and
 * mermaidFormatter.ts. Those files now re-export from here.
 *
 * Key correctness properties:
 *  - The digital-electronics rebuild only fires when a real gate NODE is
 *    declared (e.g. `OR(` / `AND(`), never on a bare substring like the words
 *    "word" or "brand".
 *  - The rebuild PRESERVES edge labels (`A -->|carry| B`) and does not collapse
 *    duplicate edges — the old Map-based rebuild silently dropped both.
 */

interface MermaidNode {
  id: string;
  label: string;
  isGate?: boolean;
}

interface MermaidEdge {
  from: string;
  to: string;
  label?: string;
}

const GATE_NODE_RE = /\b(OR|AND|NOT|XOR|NAND|NOR|XNOR)\s*\(/;

/** True when the code actually declares a logic-gate node (not a substring). */
export function looksLikeGateDiagram(code: string): boolean {
  return GATE_NODE_RE.test(code);
}

/**
 * Rebuild a digital-electronics diagram into clean Mermaid syntax.
 * Only acts on real gate diagrams; otherwise returns the input unchanged.
 * Preserves edge labels and duplicate edges.
 */
export function fixDigitalElectronicsDiagram(mermaidCode: string): string {
  if (!looksLikeGateDiagram(mermaidCode)) return mermaidCode;

  // Normalize semicolons to newlines first.
  const normalized = mermaidCode.replace(/;\s*/g, '\n');

  const nodes = new Map<string, MermaidNode>();
  const edges: MermaidEdge[] = [];

  // Node definitions with square-bracket labels: A[A], X[Output]
  const nodeRegex = /([A-Za-z0-9_]+)\s*\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = nodeRegex.exec(normalized)) !== null) {
    nodes.set(m[1], { id: m[1], label: m[2] });
  }

  // Gate definitions with paren labels: OR(OR Gate), AND(AND Gate)
  const gateRegex = /([A-Za-z0-9_]+)\s*\(([^)]+)\)/g;
  while ((m = gateRegex.exec(normalized)) !== null) {
    nodes.set(m[1], { id: m[1], label: m[2], isGate: true });
  }

  // Edges, WITH optional labels in either Mermaid form:
  //   A -->|carry| B        A -- carry --> B        A --> B
  const edgeRegex =
    /([A-Za-z0-9_]+)\s*(?:--?\s*(?:\|([^|]+)\||([^->\n]*?))\s*)?-->\s*([A-Za-z0-9_]+)/g;
  while ((m = edgeRegex.exec(normalized)) !== null) {
    const from = m[1];
    const label = (m[2] ?? m[3] ?? '').trim() || undefined;
    const to = m[4];
    edges.push({ from, to, label });
  }

  // Nothing structured found — leave it to the general fixer.
  if (nodes.size === 0 || edges.length === 0) return mermaidCode;

  const direction = /\bLR\b/.test(mermaidCode) ? 'LR' : 'TD';
  let out = `graph ${direction}\n`;

  for (const node of nodes.values()) {
    out += node.isGate ? `  ${node.id}((${node.label}))\n` : `  ${node.id}[${node.label}]\n`;
  }

  // Preserve every edge AND its label.
  for (const e of edges) {
    out += e.label ? `  ${e.from} -->|${e.label}| ${e.to}\n` : `  ${e.from} --> ${e.to}\n`;
  }

  return out;
}

const DIAGRAM_TYPES = [
  'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
  'journey', 'gantt', 'pie', 'gitGraph', 'erDiagram', 'mindmap', 'timeline',
  'sankey', 'C4Context',
];

/** Prepend a sensible diagram-type declaration if one is missing. */
function ensureDiagramType(code: string): string {
  const firstLine = code.split('\n')[0]?.trim() ?? '';
  const hasType = DIAGRAM_TYPES.some((t) => firstLine.startsWith(t));
  if (hasType) return code;

  if (code.includes('-->') || code.includes('->')) {
    return (/\bLR\b/.test(code) ? 'graph LR\n' : 'graph TD\n') + code;
  }
  if (code.includes('participant') || code.includes('actor')) {
    return 'sequenceDiagram\n' + code;
  }
  return 'flowchart TD\n' + code;
}

/**
 * General-purpose repair for AI-generated Mermaid: normalize semicolons, fix
 * gate diagrams (label-preserving), ensure a diagram type, and tidy whitespace.
 */
export function fixMermaidSyntax(mermaidCode: string): string {
  let fixed = (mermaidCode ?? '').trim();
  if (!fixed) return fixed;

  // Gate diagrams get the dedicated rebuild (which handles its own cleanup).
  if (looksLikeGateDiagram(fixed)) {
    const rebuilt = fixDigitalElectronicsDiagram(fixed);
    if (rebuilt !== fixed) return rebuilt;
  }

  // Semicolons -> newlines.
  fixed = fixed.replace(/;\s*/g, '\n');
  fixed = ensureDiagramType(fixed);

  return fixed
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

/** Alias kept for the old mermaidFormatter.formatMermaidDiagram name. */
export const formatMermaidDiagram = fixMermaidSyntax;
