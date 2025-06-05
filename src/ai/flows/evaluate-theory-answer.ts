
// src/ai/flows/evaluate-theory-answer.ts
'use server';

/**
 * @fileOverview Evaluates a student's answer to a theory-based question, providing feedback on correctness and areas for improvement.
 *
 * - evaluateTheoryAnswer - A function that handles the evaluation process.
 * - EvaluateTheoryAnswerInput - The input type for the evaluateTheoryAnswer function.
 * - EvaluateTheoryAnswerOutput - The return type for the evaluateTheoryAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EvaluateTheoryAnswerInputSchema = z.object({
  question: z.string().describe('The theory question asked to the student.'),
  studentAnswer: z.string().describe('The student response to the theory question.'),
  answerFormat: z.string().describe('The guidelines or expected format/content of the correct answer, as generated with the problem. This could describe length, key points to include, etc.'),
  topicDetails: z.string().describe('Relevant topic details for context. This might include LaTeX for math, Markdown for code, or Mermaid/descriptions for diagrams.'),
});
export type EvaluateTheoryAnswerInput = z.infer<typeof EvaluateTheoryAnswerInputSchema>;

const EvaluateTheoryAnswerOutputSchema = z.object({
  isCorrect: z.boolean().describe('Whether the student answer is correct based on the question, expected answer format, and topic details.'),
  feedback: z.string().describe('Detailed feedback on the answer, including areas for improvement. Should use LaTeX for math (e.g., $E=mc^2$ or $$x^2$$), Markdown for code (e.g., ```python\nprint("Hello")\n```), and describe diagrams or use Mermaid syntax (e.g., ```mermaid\ngraph TD; A-->B;\n```).'),
  explanation: z.string().optional().describe('Detailed explanation of why the answer is correct or incorrect.'),
  correctAnswer: z.string().describe('The complete step-by-step solution to the problem. Must include the reasoning process, intermediate steps, and final answer. Should use LaTeX for math, Markdown for code, and Mermaid for diagrams as appropriate.'),
  solutionSteps: z.array(z.object({
    stepNumber: z.number(),
    stepDescription: z.string(),
    stepExplanation: z.string()
  })).optional().describe('Breakdown of solution steps in sequential order.'),
  score: z.number().optional().describe('The score achieved for this answer.'),
  maxScore: z.number().optional().describe('The maximum possible score for this question.'),
  areasForImprovement: z.array(z.string()).optional().describe('Specific areas where the student can improve.'),
  suggestedResources: z.array(z.object({
    type: z.enum(['video', 'article', 'document']),
    title: z.string(),
    url: z.string(),
    reason: z.string(),
  })).optional().describe('Suggested resources for further learning.')
});
export type EvaluateTheoryAnswerOutput = z.infer<typeof EvaluateTheoryAnswerOutputSchema>;

export async function evaluateTheoryAnswer(input: EvaluateTheoryAnswerInput): Promise<EvaluateTheoryAnswerOutput> {
  return evaluateTheoryAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateTheoryAnswerPrompt',
  input: {schema: EvaluateTheoryAnswerInputSchema},
  output: {schema: EvaluateTheoryAnswerOutputSchema},
  prompt: `You are an expert educator providing feedback on student answers to theory questions.

Content Formatting Rules for your outputs:
1.  **Mathematical Formulas**: Use LaTeX notation. For inline math, use single dollar signs (e.g., $E=mc^2$). For display/block math, use double dollar signs (e.g., $$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$$).
2.  **Code Snippets**: Use Markdown fenced code blocks with language identifiers (e.g., \`\`\`python\nprint("Hello World")\n\`\`\` or \`\`\`javascript\nconsole.log("Hi");\n\`\`\`).
3.  **Diagrams**: If a diagram is relevant, first try to represent it using Mermaid.js syntax within a Markdown code block (e.g., \`\`\`mermaid\ngraph TD;\nA[Start] --> B(Process);\nB --> C{Decision};\nC --> D[End];\n\`\`\`). If Mermaid.js is not suitable, provide a clear textual description of the diagram.

Ensure the LaTeX, Markdown, and Mermaid syntax is syntactically correct and properly escaped within the JSON string for all fields.

Evaluate the student's answer to the following question. Use the provided 'Expected Answer Guidelines/Format' and 'Topic Details' to form your evaluation.
Determine if the answer is correct, and provide detailed feedback adhering to the formatting rules above. Set the isCorrect output field appropriately.

**IMPORTANT: The 'isCorrect' field must be set to 'true' ONLY if the student's answer is functionally equivalent to the 'correctAnswer' you derive, considering all relevant context and expected format. If there is any any significant deviation or error, it must be 'false'.**

Question:
{{{question}}}

Student's Answer:
{{{studentAnswer}}}

Expected Answer Guidelines/Format:
{{{answerFormat}}}

Topic Details (for context, may contain formatted content):
{{{topicDetails}}}

**CRITICAL REQUIREMENT: For the 'correctAnswer' field, you MUST provide a comprehensive, pedagogically sound, and strategically helpful step-by-step solution that:**
1. Breaks down the problem-solving process into clear sequential steps, guiding the student through the thought process.
2. Explains the reasoning and underlying concepts behind each step, anticipating common student misconceptions.
3. Shows all intermediate calculations or logical reasoning, making the progression transparent.
4. Arrives at the final answer with a clear conclusion.
5. Uses appropriate formatting (LaTeX for math, Markdown for code, Mermaid for diagrams).

This step-by-step solution will be shown to the student to help them understand how to solve the problem correctly and learn effective problem-solving strategies.
  `,
});

const evaluateTheoryAnswerFlow = ai.defineFlow(
  {
    name: 'evaluateTheoryAnswerFlow',
    inputSchema: EvaluateTheoryAnswerInputSchema,
    outputSchema: EvaluateTheoryAnswerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

