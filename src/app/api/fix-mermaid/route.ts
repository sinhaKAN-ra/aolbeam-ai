import { NextRequest, NextResponse } from 'next/server';
import { fixDigitalElectronicsDiagram, fixMermaidSyntax } from '../../../utils/mermaidHelper';

interface MermaidFixRequest {
  originalCode: string;
  error?: string;
}

interface MermaidFixResponse {
  fixedCode: string;
  success: boolean;
}

/**
 * API endpoint to fix Mermaid diagrams using AI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MermaidFixRequest;
    const { originalCode, error } = body;
    
    if (!originalCode) {
      return NextResponse.json(
        { error: 'Missing originalCode in request' },
        { status: 400 }
      );
    }

    // First try the specialized digital electronics fixer
    let fixedCode = fixDigitalElectronicsDiagram(originalCode);
    
    // If it didn't make any changes, use the general fixer
    if (fixedCode === originalCode) {
      fixedCode = await fixMermaidDiagramWithAI(originalCode, error);
    }
    
    return NextResponse.json({
      fixedCode,
      success: true
    } as MermaidFixResponse);
  } catch (error) {
    console.error('Error in fix-mermaid API:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Uses AI to fix a Mermaid diagram
 * In a production environment, this would call an external AI service
 * For now, we implement comprehensive fixes for common Mermaid syntax issues
 */
async function fixMermaidDiagramWithAI(originalCode: string, errorMessage?: string): Promise<string> {
  // Make a copy of the original code for processing
  let fixedCode = originalCode.trim();
  
  // Step 1: Handle semicolons that should be line breaks
  // This is common in logic diagrams where semicolons are used instead of newlines
  fixedCode = fixedCode.replace(/;\s*/g, '\n');
  
  // Step 2: Ensure proper diagram type declaration
  const diagramTypes = [
    'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
    'journey', 'gantt', 'pie', 'gitGraph', 'erDiagram', 'mindmap', 'timeline',
    'sankey', 'C4Context'
  ];
  
  const firstLine = fixedCode.split('\n')[0].trim();
  const hasValidType = diagramTypes.some(type => firstLine.startsWith(type));
  
  if (!hasValidType) {
    // Try to infer the diagram type based on content
    if (fixedCode.includes('-->') || fixedCode.includes('->')) {
      // Check if it's likely a left-to-right graph
      if (fixedCode.includes('LR') || fixedCode.match(/\b[A-Za-z0-9_]+\s*-->\s*[A-Za-z0-9_]+\b/)) {
        fixedCode = 'graph LR\n' + fixedCode;
      } else {
        fixedCode = 'graph TD\n' + fixedCode;
      }
    } else if (fixedCode.includes('participant') || fixedCode.includes('actor')) {
      fixedCode = 'sequenceDiagram\n' + fixedCode;
    } else if (fixedCode.includes('class')) {
      fixedCode = 'classDiagram\n' + fixedCode;
    } else if (fixedCode.includes('state')) {
      fixedCode = 'stateDiagram-v2\n' + fixedCode;
    } else {
      // Default to flowchart if we can't determine the type
      fixedCode = 'flowchart TD\n' + fixedCode;
    }
  }
  
  // Step 3: Fix node definitions for logic gates and components
  // Convert parentheses to double parentheses for gates
  fixedCode = fixedCode.replace(/\b([A-Za-z0-9_]+)\s*\(([^)]+)\)/g, (match, nodeName, label) => {
    // Check if this is likely a gate or component
    if (label.includes('Gate') || ['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR', 'XNOR'].includes(label.trim())) {
      return `${nodeName}((${label}))`;
    }
    return match;
  });
  
  // Step 4: Fix arrow syntax
  fixedCode = fixedCode
    // Fix arrows with text
    .replace(/--([^->\n\r]*?)-->/g, '-->|$1|')
    .replace(/--([^->\n\r]*?)->/g, '-->|$1|');
    
  // Step 5: Fix subgraph syntax
  fixedCode = fixedCode.replace(/subgraph\s+([^"\n{]+)/g, (match, name) => {
    const cleanName = name.trim();
    if (cleanName.includes(' ') && !cleanName.startsWith('"') && !cleanName.endsWith('"')) {
      return `subgraph "${cleanName}"`;
    }
    return match;
  });
  
  // Step 6: Fix node definitions (square brackets)
  fixedCode = fixedCode.replace(/\b([A-Za-z0-9_]+)\s*\[([^\]]+)\]/g, '$1[$2]');
  
  // Step 7: Add missing end statements
  const subgraphCount = (fixedCode.match(/subgraph/g) || []).length;
  const endCount = (fixedCode.match(/end/g) || []).length;
  if (subgraphCount > endCount) {
    fixedCode += '\nend';
  }
  
  // Step 8: Fix common logic gate diagram issues
  // This specifically targets digital electronics diagrams
  if (fixedCode.includes('OR') && fixedCode.includes('AND')) {
    // Make sure gates are properly formatted
    fixedCode = fixedCode
      .replace(/\bOR\b(?!\s*\(\()/g, 'OR((OR))')
      .replace(/\bAND\b(?!\s*\(\()/g, 'AND((AND))')
      .replace(/\bNOT\b(?!\s*\(\()/g, 'NOT((NOT))')
      .replace(/\bXOR\b(?!\s*\(\()/g, 'XOR((XOR))');
  }
  
  // Step 9: Format the code with proper line breaks between connections
  // Split by lines, trim each line, and remove empty lines
  const lines = fixedCode.split('\n').map(line => line.trim()).filter(line => line);
  
  // Join back with newlines
  fixedCode = lines.join('\n');
  
  // Step 10: Final check - if the diagram still has issues, try a more aggressive approach
  // This is a fallback for complex cases
  if (errorMessage && errorMessage.includes('parse error')) {
    // Extract the essential parts and rebuild the diagram
    const connections = [];
    const nodePattern = /\b([A-Za-z0-9_]+)\s*(?:\[([^\]]+)\]|\(\(([^)]+)\)\))?\s*(?:-->|->)\s*([A-Za-z0-9_]+)\s*(?:\[([^\]]+)\]|\(\(([^)]+)\)\))?/g;
    
    let match;
    while ((match = nodePattern.exec(originalCode)) !== null) {
      if (match[1] && match[4]) { // Ensure we have source and target nodes
        const sourceNode = match[1];
        const sourceLabel = match[2];
        const sourceGateLabel = match[3];
        const targetNode = match[4];
        const targetLabel = match[5];
        const targetGateLabel = match[6];
        
        let sourceFormatted = sourceNode;
        if (sourceLabel) sourceFormatted += `[${sourceLabel}]`;
        else if (sourceGateLabel) sourceFormatted += `((${sourceGateLabel}))`;
        
        let targetFormatted = targetNode;
        if (targetLabel) targetFormatted += `[${targetLabel}]`;
        else if (targetGateLabel) targetFormatted += `((${targetGateLabel}))`;
        
        connections.push(`    ${sourceFormatted} --> ${targetFormatted}`);
      }
    }
    
    if (connections.length > 0) {
      // Rebuild the diagram with proper syntax
      fixedCode = `graph LR\n${connections.join('\n')}`;
    }
  }
  
  return fixedCode;
}
