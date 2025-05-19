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
  topicDetails: z.string().describe('Relevant topic details for context.'),
});
export type EvaluateTheoryAnswerInput = z.infer<typeof EvaluateTheoryAnswerInputSchema>;

const EvaluateTheoryAnswerOutputSchema = z.object({
  isCorrect: z.boolean().describe('Whether the student answer is correct.'),
  feedback: z.string().describe('Detailed feedback on the answer, including areas for improvement.'),
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

  Evaluate the student's answer to the following question, using the provided topic details for context.  Determine if the answer is correct, and provide detailed feedback, including areas for improvement, and set the isCorrect output field appropriately.

  Question: {{{question}}}
  Student's Answer: {{{studentAnswer}}}
  Topic Details: {{{topicDetails}}}
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
