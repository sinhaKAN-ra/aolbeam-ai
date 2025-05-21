
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
  problemType: z.enum(['theory', 'practical', 'conceptual', 'numerical', 'diagram_based']).describe('The type of problem to generate.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium').describe('The desired difficulty level for the problem (easy, medium, hard).'),
});
export type GeneratePracticeProblemInput = z.infer<typeof GeneratePracticeProblemInputSchema>;

const GeneratePracticeProblemOutputSchema = z.object({
  problemStatement: z.string().describe(
    `The generated practice problem statement. Should use LaTeX for math (e.g., $E=mc^2$ or $$x^2$$), Markdown for code (e.g., \`\`\`python\nprint("Hello")\n\`\`\`), and describe diagrams or use Mermaid syntax (e.g., \`\`\`mermaid\ngraph TD; A-->B;\n\`\`\`).`
  ),
  answerFormat: z
    .string()
    .describe(
      `For theory-like questions (theory, conceptual, diagram-based if free-text): describes expected content/structure (e.g., "Explain in 2-3 sentences..."). For practical/MCQ questions (practical, or conceptual/numerical/diagram_based if MCQ): provides an explanation for why the correct answer is correct or general guidance/steps to solve.`
    ),
  multipleChoiceOptions: z.array(z.string().describe(`Multiple choice option. Should use LaTeX for math, Markdown for code, and describe/use Mermaid for diagrams if applicable.`)).optional().describe(`Multiple choice options. Primarily for "practical" type, but can be used for "conceptual", "numerical", or "diagram_based" if appropriate for an MCQ format.`),
  correctAnswer: z.string().describe(`The correct answer. For MCQ problems, this is the exact string of the correct multiple-choice option. For theory/free-text problems (theory, conceptual, numerical if not MCQ, diagram_based if free-text), this is the ideal model answer or key points/numerical value. Should use LaTeX for math, Markdown for code, and describe/use Mermaid for diagrams if applicable.`),
});
export type GeneratePracticeProblemOutput = z.infer<typeof GeneratePracticeProblemOutputSchema>;

export async function generatePracticeProblem(input: GeneratePracticeProblemInput): Promise<GeneratePracticeProblemOutput> {
  return generatePracticeProblemFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePracticeProblemPrompt',
  input: {schema: GeneratePracticeProblemInputSchema},
  output: {schema: GeneratePracticeProblemOutputSchema},
  prompt: `You are an expert in generating practice problems for students preparing for competitive exams. The student will provide a topic, problem type, and desired difficulty. You will generate a practice problem appropriate for these parameters.

Content Formatting Rules:
1.  **Mathematical Formulas**: Use LaTeX notation. For inline math, use single dollar signs (e.g., $E=mc^2$). For display/block math, use double dollar signs (e.g., $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$).
2.  **Code Snippets**: Use Markdown fenced code blocks with language identifiers (e.g., \`\`\`python
print("Hello World")
\`\`\` or \`\`\`javascript
console.log("Hi");
\`\`\`).
3.  **Diagrams**: If a diagram is needed, first try to represent it using Mermaid.js syntax within a Markdown code block (e.g., \`\`\`mermaid
graph TD;
A[Start] --> B(Process);
B --> C{Decision};
C --> D[End];
\`\`\`). If Mermaid.js is not suitable, provide a clear textual description of the diagram.

Ensure all generated content ('problemStatement', 'answerFormat', 'multipleChoiceOptions', 'correctAnswer') adheres to these formatting rules for math, code, and diagrams. The LaTeX, Markdown, and Mermaid syntax must be syntactically correct and properly escaped within the JSON string.

Topic: {{{topic}}}
Problem Type: {{{problemType}}}
Difficulty: {{{difficulty}}}

Instructions based on Problem Type:

If Problem Type is "theory":
- Generate a problem that requires a written, explanatory answer, matching the specified difficulty ({{{difficulty}}}).
- 'problemStatement' should pose the question.
- 'answerFormat' should describe the expected content and structure of the answer (e.g., "Explain in 2-3 sentences including a key formula.").
- 'correctAnswer' should contain a model or ideal textual answer.
- 'multipleChoiceOptions' should be an empty array or not provided.

If Problem Type is "practical":
- Generate a multiple-choice question (MCQ), matching the specified difficulty ({{{difficulty}}}).
- 'problemStatement' MUST pose the question clearly.
- It is MANDATORY to populate the 'multipleChoiceOptions' array with at least 3 and at most 5 distinct choices. Each option must be a plausible answer.
- 'correctAnswer' MUST be the exact string content of one of the 'multipleChoiceOptions'. Ensure this is an exact match.
- 'answerFormat' MUST provide a step-by-step explanation for why the 'correctAnswer' is correct and why other options might be incorrect, or provide general guidance/steps to solve this type of practical problem.
- DO NOT leave 'multipleChoiceOptions' empty for "practical" problems.

If Problem Type is "conceptual":
- Generate a problem that tests deep understanding of concepts, matching the specified difficulty ({{{difficulty}}}).
- This can be a theory-style question (requiring textual explanation) OR an MCQ.
- If theory-style:
    - 'answerFormat' should describe expected content/structure.
    - 'correctAnswer' should be a model textual answer.
    - 'multipleChoiceOptions' should be empty.
- If MCQ-style:
    - Populate 'multipleChoiceOptions'.
    - 'correctAnswer' MUST be the exact string of one option.
    - 'answerFormat' should explain why the chosen concept/option is correct.

If Problem Type is "numerical":
- Generate a problem that requires a numerical calculation or answer, matching the specified difficulty ({{{difficulty}}}).
- 'problemStatement' should present the problem, possibly with data.
- This can be free-text (expecting a number) OR an MCQ with numerical options.
- If free-text:
    - 'answerFormat' should guide on units or precision, and briefly outline solution steps.
    - 'correctAnswer' should be the numerical answer (e.g., "42", "3.14 m/s^2").
    - 'multipleChoiceOptions' should be empty.
- If MCQ-style:
    - Populate 'multipleChoiceOptions' with numerical choices.
    - 'correctAnswer' MUST be the exact string of one numerical option.
    - 'answerFormat' should explain the calculation steps leading to the correct option.

If Problem Type is "diagram_based":
- Generate a problem that requires interpretation, analysis, or creation related to a diagram, matching the specified difficulty ({{{difficulty}}}).
- 'problemStatement' MUST include a diagram (using Mermaid.js syntax like \`\`\`mermaid
...\`\`\` if possible, otherwise a clear textual description).
- This can be a theory-style question OR an MCQ.
- If theory-style (e.g., "Explain the process shown in the diagram"):
    - 'answerFormat' should describe expected content/structure of the explanation.
    - 'correctAnswer' should be a model textual answer explaining the diagram.
    - 'multipleChoiceOptions' should be empty.
- If MCQ-style (e.g., "What does label X in the diagram represent?"):
    - Populate 'multipleChoiceOptions'.
    - 'correctAnswer' MUST be the exact string of one option.
    - 'answerFormat' should explain why the chosen option is correct in relation to the diagram.

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

