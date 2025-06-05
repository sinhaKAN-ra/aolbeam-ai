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

// Helper function for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function for retry logic
async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  initialDelay = 1000, // 1 second
  maxDelay = 30000 // 30 seconds
): Promise<T> {
  let attempt = 0;
  let currentDelay = initialDelay;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      // Check if the error indicates a model overload or service unavailable
      // This condition might need adjustment based on the exact error structure from Genkit/Google SDK
      const isServiceUnavailable = 
        (error.message && (error.message.includes('503') || error.message.toLowerCase().includes('service unavailable') || error.message.toLowerCase().includes('model is overloaded'))) ||
        (error.status === 503);

      if (isServiceUnavailable && attempt < retries) {
        console.warn(`AI Service unavailable (attempt ${attempt}/${retries}). Retrying in ${currentDelay}ms... Error: ${error.message}`);
        await delay(currentDelay);
        currentDelay = Math.min(currentDelay * 2, maxDelay); // Exponential backoff
      } else {
        // For other errors or if retries exhausted, re-throw the error
        console.error(`AI call failed after ${attempt} attempts or due to non-retryable error:`, error);
        throw error; 
      }
    }
  }
  // Should not be reached if retries are exhausted and error is thrown, but as a fallback:
  throw new Error(`AI call failed after ${retries} retries.`);
}

const GeneratePracticeProblemInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate a practice problem.'),
  problemType: z.enum(['theory', 'practical', 'conceptual', 'numerical', 'diagram_based']).describe('The type of problem to generate.'),
  difficulty: z.enum(['easy', 'medium', 'hard'])
    .describe('The desired difficulty level for the problem (easy, medium, hard).')
    .refine(val => ['easy', 'medium', 'hard'].includes(val), {
      message: "Difficulty must be one of: 'easy', 'medium', or 'hard'"
    }),
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
  multipleChoiceOptions: z.array(z.string().describe(`Multiple choice option. Should use LaTeX for math, Markdown for code, and describe/use Mermaid for diagrams if applicable.`)).optional().describe(`Multiple choice options. Primarily for "practical" type, but can be used for "conceptual", "numerical", or "diagram_based" if appropriate for an MCQ format. If the problem is not MCQ, this should be empty or omitted.`),
  correctAnswer: z.string().describe(`The correct answer. For MCQ problems, this is the exact string of the correct multiple-choice option. For theory/free-text problems (theory, conceptual, numerical if not MCQ, diagram_based if free-text), this is the ideal model answer or key points/numerical value. Should use LaTeX for math, Markdown for code, and describe/use Mermaid for diagrams if applicable.`),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('The difficulty level of the generated problem. Should match the input difficulty if provided.')
});
export type GeneratePracticeProblemOutput = z.infer<typeof GeneratePracticeProblemOutputSchema>;

export async function generatePracticeProblem(input: GeneratePracticeProblemInput): Promise<GeneratePracticeProblemOutput> {
  // Validate difficulty parameter explicitly
  const difficulty = input.difficulty || 'medium';
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    throw new Error("Invalid difficulty level. Must be 'easy', 'medium', or 'hard'.");
  }

  // Use the validated difficulty in the API call
  const validatedInput = {
    ...input,
    difficulty
  };
  
  try {
    const result = await generatePracticeProblemFlow(validatedInput);
    // Ensure the output difficulty matches the validated input
    return { ...result, difficulty };
  } catch (error: any) {
    console.error("Error in generatePracticeProblem:", error.message);
    // Re-throw the error to be caught by the calling function in page.tsx
    // You might want to transform it into a more user-friendly error object here
    throw new Error(`Failed to generate practice problem: ${error.message}`);
  }
}

const prompt = ai.definePrompt({
  name: 'generatePracticeProblemPrompt',
  input: {schema: GeneratePracticeProblemInputSchema},
  output: {schema: GeneratePracticeProblemOutputSchema.omit({ difficulty: true })},
  // AI doesn't output difficulty, we add it post-call
  prompt: `You are an expert in generating practice problems for students preparing for competitive exams. You MUST follow the exact format and requirements specified below.

**CRITICAL: You must respond with a valid JSON object containing the required fields. Do not include any text before or after the JSON response.**

Topic: {{{topic}}}
Problem Type: {{{problemType}}}
Difficulty: {{{difficulty}}}

**STRICT FORMATTING REQUIREMENTS:**
1. **Mathematical Formulas**: Use LaTeX notation EXACTLY as shown:
   - Inline math: $E=mc^2$
   - Block math: $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$
   - Escape backslashes properly in JSON strings (use \\\\)

2. **Code Snippets**: Use Markdown fenced code blocks EXACTLY as shown:
   \`\`\`python
   print("Hello World")
   \`\`\`

3. **Diagrams**: Use Mermaid.js syntax within code blocks EXACTLY as shown:
   \`\`\`mermaid
   graph TD
   A[Start] --> B(Process)
   B --> C{Decision}
   \`\`\`
   IMPORTANT: DO NOT use semicolons (;) in Mermaid diagrams as they cause rendering issues. Use line breaks instead.

**MANDATORY PROBLEM TYPE REQUIREMENTS:**

**FOR "theory" PROBLEMS:**
- problemStatement: Must end with a clear question
- answerFormat: Must specify expected answer structure (e.g., "Explain in 2-3 sentences including key concepts")
- multipleChoiceOptions: MUST be an empty array []
- correctAnswer: Must be a complete model answer

**FOR "practical" PROBLEMS:**
- problemStatement: Must pose a clear question
- multipleChoiceOptions: MUST contain exactly 4 options (A, B, C, D format recommended)
- correctAnswer: MUST be the exact string from multipleChoiceOptions (character-for-character match)
- answerFormat: Must explain why the correct answer is right and others are wrong

**FOR "conceptual" PROBLEMS:**
Choose ONE format and follow it strictly:
- If MCQ format: Follow "practical" requirements above
- If theory format: Follow "theory" requirements above

**FOR "numerical" PROBLEMS:**
Choose ONE format and follow it strictly:
- If MCQ format: multipleChoiceOptions must contain numerical values, correctAnswer must match exactly
- If calculation format: multipleChoiceOptions must be [], correctAnswer must be the numerical result

**FOR "diagram_based" PROBLEMS:**
- problemStatement: MUST include a diagram using Mermaid syntax or clear textual description
- Choose MCQ or theory format and follow respective requirements above

**VALIDATION CHECKLIST - Your response MUST pass all these checks:**
1. ✓ Valid JSON format
2. ✓ All required fields present: problemStatement, answerFormat, correctAnswer
3. ✓ If multipleChoiceOptions exists and is not empty, correctAnswer MUST exactly match one option
4. ✓ LaTeX math uses proper escaping (\\\\) in JSON strings
5. ✓ Code blocks use proper Markdown syntax
6. ✓ Mermaid diagrams use proper syntax within code blocks
7. ✓ Problem matches the specified difficulty level (easy, medium, hard)
8. ✓ Content is appropriate for the given topic
9. ✓ For ALL problem types, correctAnswer MUST include step-by-step solution process

**EXAMPLE OUTPUT STRUCTURE:**
{
  "problemStatement": "What is the acceleration due to gravity on Earth?",
  "answerFormat": "Select the correct numerical value from the options below.",
  "multipleChoiceOptions": ["9.8 m/s²", "10.2 m/s²", "8.9 m/s²", "9.0 m/s²"],
  "correctAnswer": "9.8 m/s²"
}

Generate your response now following ALL requirements above:`, // add a newline here so output starts on a new line
});

const generatePracticeProblemFlow = ai.defineFlow(
  {
    name: 'generatePracticeProblemFlow',
    inputSchema: GeneratePracticeProblemInputSchema,
    outputSchema: GeneratePracticeProblemOutputSchema.omit({ difficulty: true }),
  },
  async (input) => {
    // Use the retry helper for the prompt call
    const result = await retryWithExponentialBackoff(async () => {
      const { output } = await prompt(input);
      if (!output) {
        // This case might happen if the prompt itself fails in a non-exception way
        // or if the model returns an empty/invalid response that Genkit handles by returning null/undefined output
        console.error("AI prompt returned no output or an invalid structure.");
        throw new Error("AI model did not return a valid output.");
      }
      return output;
    });
    return result;
  }
);

// Ensure `difficulty` is part of the final problem object returned to the client
// and stored in history, matching the input or defaulting.
// The AI model itself is not asked to generate the 'difficulty' field in its output.
// We add it back here based on the input 'difficulty'.