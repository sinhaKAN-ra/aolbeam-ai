
// 'use server';

/**
 * @fileOverview A practice problem generator for students preparing for competitive exams.
 *
 * - generatePracticeProblem - A function that generates practice problems based on user-selected topics and problem types.
 * - GeneratePracticeProblemInput - The input type for the generatePracticeProblem function.
 * - GeneratePracticeProblemOutput - The return type for the generatePracticeProblem function.
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePracticeProblemInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate a practice problem.'),
  problemType: z.enum(['theory', 'practical']).describe('The type of problem to generate (theory or practical).'),
});
export type GeneratePracticeProblemInput = z.infer<typeof GeneratePracticeProblemInputSchema>;

const GeneratePracticeProblemOutputSchema = z.object({
  problemStatement: z.string().describe('The generated practice problem statement. Should use LaTeX for math (e.g., $E=mc^2$ or $$x^2$$), Markdown for code (e.g., ```python\\nprint("Hello")\\n```), and describe diagrams or use Mermaid syntax (e.g., ```mermaid\\ngraph TD; A-->B;\\n```).'),
  answerFormat: z
    .string()
    .describe(
      'The format of the answer expected from the user. For theory questions, this will describe the expected content. For practical questions, this will describe the multiple choice options. Should use LaTeX for math, Markdown for code, and describe/use Mermaid for diagrams.'
    ),
  multipleChoiceOptions: z.array(z.string().describe('Multiple choice option. Should use LaTeX for math, Markdown for code, and describe/use Mermaid for diagrams if applicable.')).optional().describe('Multiple choice options for practical problems.'),
});
export type GeneratePracticeProblemOutput = z.infer<typeof GeneratePracticeProblemOutputSchema>;

export async function generatePracticeProblem(input: GeneratePracticeProblemInput): Promise<GeneratePracticeProblemOutput> {
  return generatePracticeProblemFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePracticeProblemPrompt',
  input: {schema: GeneratePracticeProblemInputSchema},
  output: {schema: GeneratePracticeProblemOutputSchema},
  prompt: `You are an expert in generating practice problems for students preparing for competitive exams. The student will provide a topic and problem type, and you will generate a practice problem appropriate for that topic and type.

Content Formatting Rules:
1.  **Mathematical Formulas**: Use LaTeX notation. For inline math, use single dollar signs (e.g., $E=mc^2$). For display/block math, use double dollar signs (e.g., $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$).
2.  **Code Snippets**: Use Markdown fenced code blocks with language identifiers (e.g., \`\`\`python\\nprint("Hello World")\\n\`\`\` or \`\`\`javascript\\nconsole.log("Hi");\\n\`\`\`).
3.  **Diagrams**: If a diagram is needed, first try to represent it using Mermaid.js syntax within a Markdown code block (e.g., \`\`\`mermaid\\ngraph TD;\\nA[Start] --> B(Process);\\nB --> C{Decision};\\nC --> D[End];\\n\`\`\`). If Mermaid.js is not suitable, provide a clear textual description of the diagram.

Ensure all generated content ('problemStatement', 'answerFormat', 'multipleChoiceOptions') adheres to these formatting rules for math, code, and diagrams. The LaTeX, Markdown, and Mermaid syntax must be syntactically correct and properly escaped within the JSON string.

Topic: {{{topic}}}
Problem Type: {{{problemType}}}

{
  "problemStatement": "",
  "answerFormat": "",
  "multipleChoiceOptions": [ ]
}

If the problem type is "theory", generate a problem that requires a written answer. The answerFormat field should describe the expected content of the answer. Do not include multipleChoiceOptions.
If the problem type is "practical", generate a multiple-choice problem. Populate the multipleChoiceOptions array with the choices. The answerFormat should describe which choice is correct.

Remember to apply the content formatting rules (LaTeX, Markdown for code, Mermaid/descriptions for diagrams) to all relevant fields.

Response:
`, // add a newline here so output starts on a new line
});

const generatePracticeProblemFlow = ai.defineFlow(
  {
    name: 'generatePracticeProblemFlow',
    inputSchema: GeneratePracticeProblemInputSchema,
    outputSchema: GeneratePracticeProblemOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

