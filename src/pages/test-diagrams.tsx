"use client";

import React, { useEffect, useState } from 'react';
import MathRenderer from '../components/MathRenderer';

export default function TestDiagrams() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Example diagrams that would previously fail
  const diagrams = [
    {
      id: 'logic-gate',
      title: 'Digital Electronics - Logic Gate Circuit',
      code: '```mermaid\ngraph LR; A[A] --> OR(OR Gate); B[B] --> OR; OR --> AND(AND Gate); C[C] --> AND; AND --> X[X];\n```',
      description: 'This diagram shows a circuit where inputs A and B feed into an OR gate, the output of the OR gate and input C feed into an AND gate, producing output X.'
    },
    {
      id: 'flow-chart',
      title: 'Process Flow Chart',
      code: '```mermaid\ngraph TD; A[Start] --> B{Decision?}; B -->|Yes| C[Process 1]; B -->|No| D[Process 2]; C --> E[End]; D --> E;\n```',
      description: 'A simple flowchart showing a decision process.'
    },
    {
      id: 'sequence',
      title: 'Sequence Diagram',
      code: '```mermaid\nsequenceDiagram; participant User; participant System; User->>System: Request; System-->>User: Response;\n```',
      description: 'A sequence diagram showing communication between a user and a system.'
    },
    {
      id: 'class',
      title: 'Class Diagram',
      code: '```mermaid\nclassDiagram; class MathRenderer{+render() -fixDiagram()}; class MermaidFixer{+fix()}; MermaidFixer <|-- MathRenderer;\n```',
      description: 'A class diagram showing the relationship between MathRenderer and MermaidFixer.'
    },
  ];

  if (!isMounted) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Mermaid Diagram Test</h1>
      <p className="mb-8 text-gray-700">
        This page demonstrates the fixed Mermaid diagram rendering with our enhanced formatter 
        that handles various AI-generated formats including those with semicolons.
      </p>
      
      <div className="grid gap-8">
        {diagrams.map((diagram) => (
          <div key={diagram.id} className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-50 p-4 border-b">
              <h2 className="text-xl font-semibold">{diagram.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{diagram.description}</p>
            </div>
            
            <div className="p-6 bg-white">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Original Code:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">{diagram.code}</pre>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Rendered Diagram:</h3>
                <div className="border rounded p-4 bg-gray-50">
                  <MathRenderer content={diagram.code} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
