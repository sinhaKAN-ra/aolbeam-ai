/**
 * Utility for ensuring Mermaid diagrams render properly
 * Handles common formatting issues across different topics
 */

export function formatMermaidDiagram(input: string): string {
  // Skip empty input
  if (!input || input.trim().length === 0) {
    return input;
  }

  // Step 1: Convert semicolons to newlines (common issue in AI-generated diagrams)
  let formatted = input.replace(/;\s*(?=\S)/g, '\n');

  // Step 2: Handle one-line diagrams by adding proper line breaks
  if (!formatted.includes('\n')) {
    // If this is a one-line diagram with semicolons, replace them with newlines
    formatted = formatted.replace(/;\s*/g, '\n');
    
    // If still no newlines, try to find natural breaking points
    if (!formatted.includes('\n')) {
      formatted = formatted
        .replace(/\s*(-->|->|---|---)\s*/g, '\n$1 ')
        .replace(/\s*\[/g, '\n[');
    }
  }

  // Step 3: Fix digital electronics diagrams (common in diagram_based problems)
  if (formatted.includes('OR') || formatted.includes('AND') || formatted.includes('Gate')) {
    formatted = fixDigitalElectronicsDiagram(formatted);
  }

  // Step 4: Ensure proper diagram type declaration
  const firstLine = formatted.split('\n')[0].trim();
  if (!firstLine.startsWith('graph') && 
      !firstLine.startsWith('flowchart') && 
      !firstLine.startsWith('sequenceDiagram') &&
      !firstLine.startsWith('classDiagram')) {
    
    // If it has arrows, it's probably a graph
    if (formatted.includes('-->') || formatted.includes('->')) {
      if (formatted.includes('LR')) {
        formatted = 'graph LR\n' + formatted;
      } else {
        formatted = 'graph TD\n' + formatted;
      }
    }
  }

  // Step 5: Remove excessive whitespace and normalize line breaks
  formatted = formatted
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  return formatted;
}

/**
 * Specifically fixes digital electronics diagram formats
 */
function fixDigitalElectronicsDiagram(input: string): string {
  // Check if this looks like a digital electronics diagram
  if (input.includes('OR') || input.includes('AND') || input.includes('Gate')) {
    // Extract all nodes and connections
    const nodes = new Map<string, {id: string, label: string, isGate?: boolean}>();
    const connections: {from: string, to: string}[] = [];
    
    // Extract node definitions with labels: A[A], B[B], X[X]
    const nodeRegex = /([A-Za-z0-9_]+)\s*\[([^\]]+)\]/g;
    let nodeMatch;
    while ((nodeMatch = nodeRegex.exec(input)) !== null) {
      nodes.set(nodeMatch[1], { id: nodeMatch[1], label: nodeMatch[2] });
    }
    
    // Extract gate definitions: OR(OR Gate), AND(AND Gate)
    const gateRegex = /([A-Za-z0-9_]+)\s*\(([^\)]+)\)/g;
    let gateMatch;
    while ((gateMatch = gateRegex.exec(input)) !== null) {
      nodes.set(gateMatch[1], { id: gateMatch[1], label: gateMatch[2], isGate: true });
    }
    
    // Extract connections: A --> OR, OR --> AND, etc.
    const connectionRegex = /([A-Za-z0-9_]+)\s*(?:-->|->)\s*([A-Za-z0-9_]+)/g;
    let connMatch;
    while ((connMatch = connectionRegex.exec(input)) !== null) {
      connections.push({ from: connMatch[1], to: connMatch[2] });
    }
    
    // If we found enough nodes and connections, rebuild the diagram
    if (nodes.size > 0 && connections.length > 0) {
      // Rebuild the diagram with proper syntax
      let rebuiltCode = input.includes('LR') ? 'graph LR\n' : 'graph TD\n';
      
      // Add node definitions
      for (const [id, node] of nodes.entries()) {
        if (node.isGate) {
          rebuiltCode += `${id}((${node.label}))\n`;
        } else {
          rebuiltCode += `${id}[${node.label}]\n`;
        }
      }
      
      // Add connections
      for (const conn of connections) {
        rebuiltCode += `${conn.from} --> ${conn.to}\n`;
      }
      
      return rebuiltCode;
    }
  }
  
  // If not a digital electronics diagram or not enough info to rebuild, return input
  return input;
}
