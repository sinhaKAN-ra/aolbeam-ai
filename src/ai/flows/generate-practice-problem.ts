
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
  problemStatement: z.string().describe('The generated practice problem statement. Should use LaTeX for math, e.g., $E=mc^2$ or $$x^2$$'),
  answerFormat: z
    .string()
    .describe(
      'The format of the answer expected from the user. For theory questions, this will describe the expected content of the answer. For practical questions, this will describe the multiple choice options. Should use LaTeX for math.'
    ),
  multipleChoiceOptions: z.array(z.string().describe('Multiple choice option. Should use LaTeX for math if applicable.')).optional().describe('Multiple choice options for practical problems.'),
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
When generating 'problemStatement', 'answerFormat', or 'multipleChoiceOptions' that include mathematical formulas or expressions, you MUST use LaTeX notation.
For inline math, use single dollar signs (e.g., $E=mc^2$).
For display/block math (equations on their own line), use double dollar signs (e.g., $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$).
Ensure the LaTeX is syntactically correct and properly escaped within the JSON string. Example: "The equation is $$a^2 + b^2 = c^2$$."

Topic: {{{topic}}}
Problem Type: {{{problemType}}}

{
  "problemStatement": "",
  "answerFormat": "",
  "multipleChoiceOptions": [ ]
}

If the problem type is "theory", generate a problem that requires a written answer. The answerFormat field should describe the expected content of the answer. Do not include multipleChoiceOptions.
If the problem type is "practical", generate a multiple-choice problem. Populate the multipleChoiceOptions array with the choices. The answerFormat should describe which choice is correct.
Remember to use LaTeX for any math in all relevant fields ('problemStatement', 'answerFormat', 'multipleChoiceOptions').

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
