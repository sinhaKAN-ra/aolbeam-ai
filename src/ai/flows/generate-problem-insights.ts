
// src/ai/flows/generate-problem-insights.ts
'use server';

/**
 * @fileOverview Generates insights and problem-solving patterns specific to a given problem statement.
 *
 * - generateProblemInsights - A function that handles the insight generation process.
 * - GenerateProblemInsightsInput - The input type for the generateProblemInsights function.
 * - GenerateProblemInsightsOutput - The return type for the generateProblemInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProblemInsightsInputSchema = z.object({
  problemStatement: z.string().describe('The specific problem statement for which to generate insights. This may contain LaTeX, Markdown, or Mermaid diagrams.'),
  topic: z.string().describe('The general topic of the problem, providing broader context.'),
});
export type GenerateProblemInsightsInput = z.infer<typeof GenerateProblemInsightsInputSchema>;

const GenerateProblemInsightsOutputSchema = z.object({
  insights: z.string().describe('Actionable insights, key patterns, underlying principles, and common steps or strategies required to solve the provided type of problem. Should use LaTeX for math, Markdown for code, and describe diagrams or use Mermaid syntax if applicable. This should guide the student to recognize these patterns in similar problems.'),
});
export type GenerateProblemInsightsOutput = z.infer<typeof GenerateProblemInsightsOutputSchema>;

export async function generateProblemInsights(input: GenerateProblemInsightsInput): Promise<GenerateProblemInsightsOutput> {
  return generateProblemInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProblemInsightsPrompt',
  input: {schema: GenerateProblemInsightsInputSchema},
  output: {schema: GenerateProblemInsightsOutputSchema},
  prompt: `You are an expert problem-solving coach. Your goal is to help a student understand how to approach and solve a specific type of problem by recognizing underlying patterns and principles.

Given the following problem statement and its general topic, provide concise and actionable insights. Focus on:
- The key patterns or concepts embedded in this specific problem.
- The underlying principles or formulas that are essential for this type of problem.
- Common steps or a general strategy to tackle problems of this nature.
- Tips on what to look for to identify this pattern in future problems.

Do NOT solve the problem directly. Your explanation should empower the student to solve it themselves and similar problems.

Content Formatting Rules for your 'insights' output:
1.  **Mathematical Formulas**: Use LaTeX notation. For inline math, use single dollar signs (e.g., $E=mc^2$). For display/block math, use double dollar signs (e.g., $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$).
2.  **Code Snippets**: Use Markdown fenced code blocks with language identifiers (e.g., \`\`\`python\\nprint("Hello World")\\n\`\`\` or \`\`\`javascript\\nconsole.log("Hi");\\n\`\`\`).
3.  **Diagrams**: If a diagram is relevant to illustrate a pattern or concept, first try to represent it using Mermaid.js syntax within a Markdown code block (e.g., \`\`\`mermaid\\ngraph TD;\\nA[Start] --> B(Process);\\nB --> C{Decision};\\nC --> D[End];\\n\`\`\`). If Mermaid.js is not suitable, provide a clear textual description of the diagram.

Ensure the LaTeX, Markdown, and Mermaid syntax is syntactically correct and properly escaped within the JSON string for the 'insights' field.

Problem Statement:
{{{problemStatement}}}

General Topic:
{{{topic}}}

Problem-Solving Insights & Patterns:`,
});

const generateProblemInsightsFlow = ai.defineFlow(
  {
    name: 'generateProblemInsightsFlow',
    inputSchema: GenerateProblemInsightsInputSchema,
    outputSchema: GenerateProblemInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

