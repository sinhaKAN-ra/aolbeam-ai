import { NextResponse } from 'next/server';
import { runWithFallback, AllProvidersFailedError } from '@/lib/ai/runWithFallback';
import { extractJsonString } from '@/lib/ai/providers/types';

/**
 * AI endpoint. Route path kept as /api/gemini for backward compatibility, but
 * internally it now runs through the multi-provider fallback chain
 * (Gemini -> OpenAI -> Groq -> ...). If one provider's key is expired or over
 * quota, the next provider answers automatically. See src/lib/ai/.
 */
export async function POST(req: Request) {
  try {
    const { action, params } = await req.json();

    switch (action as string) {
      case 'generateLearningContext': {
        const { topic } = params;
        const prompt = `Provide a concise learning context about ${topic} for a student. Include key concepts and why they're important.`;
        try {
          const { text } = await runWithFallback({ prompt, temperature: 0.2 });
          return NextResponse.json({ text });
        } catch (error: any) {
          console.error('generateLearningContext failed on all providers:', error);
          // Keep UI flow: 200 with a friendly message + machine-readable error.
          return NextResponse.json(
            {
              text: `I'd be happy to teach you about ${topic}. Could you ask me again? I'm having trouble reaching the AI service right now.`,
              error: errMessage(error),
            },
            { status: 200 }
          );
        }
      }

      case 'generateTopicSuggestions': {
        const { topic, count = 3 } = params;
        const prompt = `
        Generate exactly ${count} related learning topics about ${topic}.

        For each topic, include:
        - title: Short descriptive name
        - description: 1-2 sentence explanation
        - difficulty: One of exactly 'beginner', 'intermediate', or 'advanced'

        Format your response as a clean JSON array with no additional text, markdown, or comments.
        Example format: [{"title": "Topic 1", "description": "Description 1", "difficulty": "beginner"}, ...]
        `;
        try {
          const { text } = await runWithFallback({ prompt, temperature: 0.2, json: true });
          const suggestions = JSON.parse(extractJsonString(text));
          return NextResponse.json({ suggestions });
        } catch (error) {
          console.error('generateTopicSuggestions failed/unparseable:', error);
          return NextResponse.json({ suggestions: fallbackSuggestions(topic) });
        }
      }

      case 'generatePracticeProblems': {
        const { topic, count = 3 } = params;
        const prompt = `Generate a list of ${count} concise practice problems about ${topic}. Return only a JSON array of problem statements, no explanations or answers needed. Format example: ["Problem 1", "Problem 2"]`;
        try {
          const { text } = await runWithFallback({
            prompt,
            temperature: 0.7,
            maxOutputTokens: 500,
            json: true,
          });
          let problems = JSON.parse(extractJsonString(text));
          if (!Array.isArray(problems)) problems = Object.values(problems).flat();
          problems = problems.map((p: any) => (typeof p === 'string' ? p : JSON.stringify(p)));
          return NextResponse.json({ practiceProblem: problems });
        } catch (error) {
          console.error('generatePracticeProblems failed/unparseable:', error);
          return NextResponse.json(
            { error: 'Failed to generate practice problems' },
            { status: 500 }
          );
        }
      }

      case 'generateLearningPath': {
        const { topic } = params;
        const prompt = `
        Generate a detailed learning path for learning about ${topic} suitable for a student.

        Create the response as a valid JSON object with these properties:
        - title: A descriptive title for the learning path
        - steps: An array of step objects where each step has:
          - id: A numeric ID (1, 2, 3, etc.)
          - title: Short, descriptive title
          - description: Detailed explanation (2-3 sentences)
          - difficulty: One of 'beginner', 'intermediate', or 'advanced'
          - estimatedTime: String like '1-2 weeks'

        Format as CLEAN JSON only with no explanations, markdown, or code blocks.
        `;
        try {
          const { text } = await runWithFallback({ prompt, temperature: 0.2, json: true });
          const pathData = JSON.parse(extractJsonString(text));
          return NextResponse.json(pathData);
        } catch (error) {
          console.error('generateLearningPath failed/unparseable:', error);
          return NextResponse.json(fallbackLearningPath(topic));
        }
      }

      default:
        return NextResponse.json({ error: 'Invalid API request type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Unhandled AI route error:', error);
    return NextResponse.json({ error: `API Error: ${errMessage(error)}` }, { status: 500 });
  }
}

function errMessage(error: unknown): string {
  if (error instanceof AllProvidersFailedError) {
    return `All AI providers unavailable: ${error.attempts
      .map((a) => `${a.provider} (${a.error})`)
      .join('; ')}`;
  }
  return (error as Error)?.message || 'Unknown error';
}

function fallbackSuggestions(topic: string) {
  return [
    { title: `${topic} Fundamentals`, description: `Learn the basic principles and concepts of ${topic}.`, difficulty: 'beginner' },
    { title: `Intermediate ${topic} Concepts`, description: `Dive deeper into more complex aspects of ${topic}.`, difficulty: 'intermediate' },
    { title: `Advanced ${topic} Applications`, description: `Explore cutting-edge applications and advanced techniques in ${topic}.`, difficulty: 'advanced' },
  ];
}

function fallbackLearningPath(topic: string) {
  return {
    title: `Learning Path for ${topic}`,
    steps: [
      { id: 1, title: 'Getting Started', description: `Begin your ${topic} journey with the fundamentals.`, difficulty: 'beginner', estimatedTime: '1-2 weeks' },
      { id: 2, title: 'Core Concepts', description: `Explore essential ${topic} concepts in depth.`, difficulty: 'intermediate', estimatedTime: '2-3 weeks' },
      { id: 3, title: 'Advanced Applications', description: `Apply your ${topic} knowledge to solve complex problems.`, difficulty: 'advanced', estimatedTime: '3-4 weeks' },
    ],
  };
}
