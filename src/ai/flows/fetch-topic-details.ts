
// This file is deprecated and replaced by generate-problem-insights.ts
// Keeping it here to avoid breaking existing references during the transition,
// but it should be removed once all uses are updated.

'use server';

/**
 * @fileOverview DEPRECATED: Fetches general topic details. Use generate-problem-insights.ts for problem-specific insights.
 *
 * - fetchTopicDetails - A function that handles the topic details retrieval process.
 * - FetchTopicDetailsInput - The input type for the fetchTopicDetails function.
 * - FetchTopicDetailsOutput - The return type for the fetchTopicDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FetchTopicDetailsInputSchema = z.object({
  topic: z.string().describe('The topic to fetch details for.'),
});
export type FetchTopicDetailsInput = z.infer<typeof FetchTopicDetailsInputSchema>;

const FetchTopicDetailsOutputSchema = z.object({
  details: z.string().describe('The details of the topic, focusing on key concepts, common problem-solving patterns, and approaches. Should use LaTeX for math (e.g., $E=mc^2$ or $$x^2$$), Markdown for code (e.g., ```python\\nprint("Hello")\\n```), and describe diagrams or use Mermaid syntax (e.g., ```mermaid\\ngraph TD; A-->B;\\n```).'),
});
export type FetchTopicDetailsOutput = z.infer<typeof FetchTopicDetailsOutputSchema>;

export async function fetchTopicDetails(input: FetchTopicDetailsInput): Promise<FetchTopicDetailsOutput> {
  console.warn("DEPRECATED: fetchTopicDetails is called. Use generateProblemInsights instead.");
  // For now, let's just return a dummy response or call the old prompt if it still exists
  // Or, ideally, this function body would be updated or removed.
  // Returning a basic message indicating deprecation:
  return { details: "This topic detail fetcher is deprecated. Please use problem-specific insights." };
  // OR adapt to call the new flow if possible, though input schemas differ.
  // For a cleaner transition, this flow should not be used directly.
}

// Old prompt - keeping for reference if needed, but ideally this whole file is removed.
/*
const prompt = ai.definePrompt({
  name: 'fetchTopicDetailsPrompt', // This name might conflict if not removed/renamed
  input: {schema: FetchTopicDetailsInputSchema},
  output: {schema: FetchTopicDetailsOutputSchema},
  prompt: `You are an expert educator focused on helping students understand **underlying principles and common problem-solving patterns** for competitive exams. The user will provide a topic: {{{topic}}}.

Your response should provide concise, actionable insights related to this topic, specifically highlighting:
- Key concepts crucial for solving problems related to '{{{topic}}}'.
- Common patterns, formulas, or methodologies frequently seen in problems involving '{{{topic}}}'.
- Tips on how to approach problems of this nature, including common pitfalls to avoid.
- Where applicable, use simple illustrative examples or analogies to explain these patterns or concepts.

Your goal is to equip the student to **recognize and apply these patterns** when they encounter new problems on '{{{topic}}}'. The explanation should be clear and directly useful for someone trying to improve their problem-solving skills for exams.

Content Formatting Rules for your 'details' output:
1.  **Mathematical Formulas**: Use LaTeX notation. For inline math, use single dollar signs (e.g., $E=mc^2$). For display/block math, use double dollar signs (e.g., $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$).
2.  **Code Snippets**: Use Markdown fenced code blocks with language identifiers (e.g., \`\`\`python\\nprint("Hello World")\\n\`\`\` or \`\`\`javascript\\nconsole.log("Hi");\\n\`\`\`).
3.  **Diagrams**: If a diagram is relevant to illustrate a pattern or concept, first try to represent it using Mermaid.js syntax within a Markdown code block (e.g., \`\`\`mermaid\\ngraph TD;\\nA[Start] --> B(Process);\\nB --> C{Decision};\\nC --> D[End];\\n\`\`\`). If Mermaid.js is not suitable, provide a clear textual description of the diagram.

Ensure the LaTeX, Markdown, and Mermaid syntax is syntactically correct and properly escaped within the JSON string for the 'details' field.

Topic: {{{topic}}}

Actionable Insights & Patterns: `,
});

const fetchTopicDetailsFlow = ai.defineFlow(
  {
    name: 'fetchTopicDetailsFlow', // This name might conflict if not removed/renamed
    inputSchema: FetchTopicDetailsInputSchema,
    outputSchema: FetchTopicDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
*/

