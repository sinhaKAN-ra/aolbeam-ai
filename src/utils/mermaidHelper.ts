/**
 * Helper utilities for handling Mermaid diagrams
 */

/**
 * Specifically fixes digital electronics diagram formats
 * This handles the format: graph LR; A[A] --> OR(OR Gate); B[B] --> OR; OR --> AND(AND Gate); C[C] --> AND; AND --> X[X];
 * @param mermaidCode The original Mermaid code
 * @returns Properly formatted Mermaid code
 */
export function fixDigitalElectronicsDiagram(mermaidCode: string): string {
  // Check if this looks like a digital electronics diagram
  if (mermaidCode.includes('graph LR;') && 
      (mermaidCode.includes('OR') || mermaidCode.includes('AND')) && 
      mermaidCode.includes('Gate')) {
    
    // Replace semicolons with newlines
    let fixedCode = mermaidCode.replace(/;\s*/g, '\n');
    
    // Extract all nodes and connections
    const nodes = new Map<string, {id: string, label: string, isGate?: boolean}>();
    const connections: {from: string, to: string}[] = [];
    
    // Extract node definitions with labels: A[A], B[B], X[X]
    const nodeRegex = /([A-Za-z0-9_]+)\s*\[([^\]]+)\]/g;
    let nodeMatch;
    while ((nodeMatch = nodeRegex.exec(fixedCode)) !== null) {
      nodes.set(nodeMatch[1], { id: nodeMatch[1], label: nodeMatch[2] });
    }
    
    // Extract gate definitions: OR(OR Gate), AND(AND Gate)
    const gateRegex = /([A-Za-z0-9_]+)\s*\(([^\)]+)\)/g;
    let gateMatch;
    while ((gateMatch = gateRegex.exec(fixedCode)) !== null) {
      nodes.set(gateMatch[1], { id: gateMatch[1], label: gateMatch[2], isGate: true });
    }
    
    // Extract connections: A --> OR, OR --> AND, etc.
    const connectionRegex = /([A-Za-z0-9_]+)\s*-->\s*([A-Za-z0-9_]+)/g;
    let connMatch;
    while ((connMatch = connectionRegex.exec(fixedCode)) !== null) {
      connections.push({ from: connMatch[1], to: connMatch[2] });
    }
    
    // Rebuild the diagram with proper syntax
    let rebuiltCode = 'graph LR\n';
    
    // Add node definitions
    for (const [id, node] of nodes.entries()) {
      if (node.isGate) {
        rebuiltCode += `  ${id}((${node.label}))\n`;
      } else {
        rebuiltCode += `  ${id}[${node.label}]\n`;
      }
    }
    
    // Add connections
    for (const conn of connections) {
      rebuiltCode += `  ${conn.from} --> ${conn.to}\n`;
    }
    
    return rebuiltCode;
  }
  
  // If it's not a digital electronics diagram, return the original code
  return mermaidCode;
}

/**
 * Fixes a Mermaid diagram that has failed to render
 * This handles various common syntax issues
 * @param mermaidCode The original Mermaid code
 * @returns Properly formatted Mermaid code
 */
export function fixMermaidSyntax(mermaidCode: string): string {
  // First check if it's a digital electronics diagram
  const digitalElectronicsResult = fixDigitalElectronicsDiagram(mermaidCode);
  if (digitalElectronicsResult !== mermaidCode) {
    return digitalElectronicsResult;
  }
  
  // General fixes
  let fixedCode = mermaidCode.trim();
  
  // Handle semicolons that should be line breaks
  fixedCode = fixedCode.replace(/;\s*/g, '\n');
  
  // Ensure proper diagram type declaration
  const diagramTypes = [
    'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
    'journey', 'gantt', 'pie', 'gitGraph', 'erDiagram', 'mindmap', 'timeline',
    'sankey', 'C4Context'
  ];
  
  const firstLine = fixedCode.split('\n')[0].trim();
  const hasValidType = diagramTypes.some(type => firstLine.startsWith(type));
  
  if (!hasValidType) {
    // If it has arrows, it's likely a graph
    if (fixedCode.includes('-->') || fixedCode.includes('->')) {
      // Check if it's likely a left-to-right graph
      if (fixedCode.includes('LR')) {
        fixedCode = 'graph LR\n' + fixedCode;
      } else {
        fixedCode = 'graph TD\n' + fixedCode;
      }
    } else if (fixedCode.includes('participant') || fixedCode.includes('actor')) {
      fixedCode = 'sequenceDiagram\n' + fixedCode;
    } else {
      // Default to flowchart if we can't determine the type
      fixedCode = 'flowchart TD\n' + fixedCode;
    }
  }
  
  // Fix logic gates formatting
  fixedCode = fixedCode.replace(/\b([A-Za-z0-9_]+)\s*\(([^\)]+Gate[^\)]*)\)/g, '$1(($2))');
  
  // Fix specific gates
  fixedCode = fixedCode
    .replace(/\bOR\b(?!\s*\(\()/g, 'OR((OR))')
    .replace(/\bAND\b(?!\s*\(\()/g, 'AND((AND))')
    .replace(/\bNOT\b(?!\s*\(\()/g, 'NOT((NOT))')
    .replace(/\bXOR\b(?!\s*\(\()/g, 'XOR((XOR))');
  
  // Format the code with proper line breaks
  const lines = fixedCode.split('\n').map(line => line.trim()).filter(line => line);
  return lines.join('\n');
}
