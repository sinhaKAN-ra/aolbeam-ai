// src/ai/flows/generate-problem-insights.ts
'use server';

/**
 * @fileOverview Generates memorizable insights and problem-solving patterns for exam preparation.
 *
 * - generateProblemInsights - A function that creates structured, memorable patterns for students
 * - GenerateProblemInsightsInput - The input type for the generateProblemInsights function
 * - GenerateProblemInsightsOutput - The return type with enhanced pattern recognition structure
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateProblemInsightsInputSchema = z.object({
  problemStatement: z.string().describe('The specific problem statement for which to generate insights. This may contain LaTeX, Markdown, or Mermaid diagrams.'),
  topic: z.string().describe('The general topic of the problem, providing broader context.'),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe('Problem difficulty to tailor pattern complexity'),
  examContext: z.boolean().optional().describe('Whether this is for exam preparation (affects memorization focus)'),
});
export type GenerateProblemInsightsInput = z.infer<typeof GenerateProblemInsightsInputSchema>;

const GenerateProblemInsightsOutputSchema = z.object({
  patternSignature: z.string().describe('A memorable 2-3 word identifier for this problem type (e.g., "Chain Rule Pattern", "Substitution Method")'),
  quickRecognitionTriggers: z.array(z.string()).describe('3-5 key phrases or visual cues that instantly identify this problem type in exams'),
  corePattern: z.string().describe('The fundamental solving approach in a structured, step-by-step format using LaTeX, Markdown, and Mermaid as needed'),
  memoryAnchors: z.object({
    formula: z.string().optional().describe('Key formula to memorize, formatted in LaTeX'),
    mnemonic: z.string().optional().describe('Memory device or acronym to remember the approach'),
    visualPattern: z.string().optional().describe('Visual or conceptual pattern description')
  }).describe('Memorable elements to help quick recall during exams'),
  commonMistakes: z.array(z.string()).describe('Top 3 mistakes students make with this pattern'),
  speedTips: z.array(z.string()).describe('Time-saving shortcuts for exam conditions'),
  practiceCheckpoints: z.array(z.string()).describe('Quick self-check questions to verify understanding')
});
export type GenerateProblemInsightsOutput = z.infer<typeof GenerateProblemInsightsOutputSchema>;

export async function generateProblemInsights(input: GenerateProblemInsightsInput): Promise<GenerateProblemInsightsOutput> {
  return generateProblemInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProblemInsightsPrompt',
  input: { schema: GenerateProblemInsightsInputSchema },
  output: { schema: GenerateProblemInsightsOutputSchema },
}, `You are an expert exam preparation coach specializing in creating MEMORABLE problem-solving patterns that students can quickly recall under exam pressure.

Your mission: Transform this problem into a recognizable, memorable pattern that students can instantly identify and apply in 30 seconds or less during an exam.

CRITICAL REQUIREMENTS:
1. **Pattern Signature**: Create a catchy, memorable name (2-3 words max) that students will instantly associate with this problem type
2. **Lightning Recognition**: Identify the exact words, symbols, or structures that scream "this is THAT type of problem!"
3. **Exam-Speed Solution**: Provide a streamlined approach optimized for time pressure
4. **Memory Anchors**: Create mental hooks (formulas, mnemonics, visuals) for instant recall
5. **Error Prevention**: Highlight the traps students fall into with this pattern
6. **Speed Hacks**: Share time-saving shortcuts that work under pressure

FORMATTING GUIDELINES:
- **Math**: Use LaTeX with $ for inline, $ for display formulas
- **Code**: Use \`\`\`language blocks for any code examples
- **Diagrams**: Use \`\`\`mermaid for flowcharts/diagrams when helpful
- **Structure**: Make everything scannable - students need to absorb this FAST

Think like a student cramming for an exam - what would they need to recognize this pattern in 5 seconds and solve it in 2 minutes?

Problem Statement: {{problemStatement}}
Topic: {{topic}}
Difficulty: {{difficultyLevel}}
Exam Context: {{examContext}}

Generate insights that will make students think "I've seen this pattern before!" when they encounter similar problems.`);

const generateProblemInsightsFlow = ai.defineFlow({
  name: 'generateProblemInsightsFlow',
  inputSchema: GenerateProblemInsightsInputSchema,
  outputSchema: GenerateProblemInsightsOutputSchema,
}, async (input) => {
  // Set defaults for optional parameters to optimize for exam preparation
  const enhancedInput = {
    ...input,
    examContext: input.examContext ?? true,
    difficultyLevel: input.difficultyLevel ?? 'intermediate' as const
  };
  
  const {output} = await prompt(enhancedInput);
  return output!;
});