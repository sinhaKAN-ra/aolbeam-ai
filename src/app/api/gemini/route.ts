import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

export async function POST(req: Request) {
  try {
    const { type, payload } = await req.json();

    switch (type) {
      case 'generateLearningContext': {
        const { topic } = payload;
        const prompt = `Provide a concise learning context about ${topic} for a student. Include key concepts and why they're important.`;
        try {
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 }
          });
          const response = await result.response;
          return NextResponse.json({ text: response.text() });
        } catch (error: any) {
          console.error(`Error in generateLearningContext: ${error}`);
          return NextResponse.json({ 
            text: `I'd be happy to teach you about ${topic}. Could you ask me again? I'm having trouble connecting to my knowledge base at the moment.`,
            error: `Failed to generate learning context: ${error?.message || 'Unknown error'}`
          }, { status: 200 }); // Send 200 with error message in payload to maintain UI flow
        }
      }
      case 'generateTopicSuggestions': {
        const { topic, count = 3 } = payload;
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
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 }
          });
          
          const response = await result.response;
          const raw = response.text();
          console.log('Raw Gemini response:', raw);
          
          // Clean up the JSON string
          let jsonString = raw;
          
          // Try to find JSON array with regex
          const arrayMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (arrayMatch) {
            jsonString = arrayMatch[0];
          } else {
            // Remove markdown code fences if present
            const fenceMatch = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
            if (fenceMatch && fenceMatch[1]) {
              jsonString = fenceMatch[1].trim();
            }
          }
          
          // Remove any comments or text outside the array
          jsonString = jsonString.replace(/\/\/.*/g, '');
          jsonString = jsonString.trim();
          
          console.log('Cleaned JSON string:', jsonString);
          
          try {
            const suggestions = JSON.parse(jsonString);
            return NextResponse.json({ suggestions });
          } catch (innerError) {
            console.error('Inner JSON parse error:', innerError);
            throw innerError; // Let outer catch handle the fallback
          }
        } catch (parseError) {
          console.error('Failed to parse topic suggestions JSON:', parseError);
          
          // Return fallback suggestions rather than failing
          const fallbackSuggestions = [
            {
              title: `${topic} Fundamentals`,
              description: `Learn the basic principles and concepts of ${topic}.`,
              difficulty: 'beginner'
            },
            {
              title: `Intermediate ${topic} Concepts`,
              description: `Dive deeper into more complex aspects of ${topic}.`,
              difficulty: 'intermediate'
            },
            {
              title: `Advanced ${topic} Applications`,
              description: `Explore cutting-edge applications and advanced techniques in ${topic}.`,
              difficulty: 'advanced'
            }
          ];
          
          return NextResponse.json({ suggestions: fallbackSuggestions });
        }
      }
      case 'generatePracticeProblem': {
        const { topic } = payload;
        const prompt = `Create a practice problem about ${topic} with a question, multiple choice options, correct answer, and explanation. Format as valid JSON with no markdown or code blocks.`;
        
        try {
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 }
          });
          const response = await result.response;
          const raw = response.text();
          
          // Clean up the JSON string
          let jsonString = raw;
          
          // Remove markdown code fences if present
          const fenceMatch = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
          if (fenceMatch && fenceMatch[1]) {
            jsonString = fenceMatch[1].trim();
          } else {
            // Try to find JSON object with regex
            const objMatch = raw.match(/\{[\s\S]*\}/);
            if (objMatch) {
              jsonString = objMatch[0];
            } else {
              // Just clean up markdown
              jsonString = raw.replace(/```/g, '').trim();
            }
          }
          
          const problem = JSON.parse(jsonString);
          return NextResponse.json({ problem });
        } catch (parseError) {
          console.error('Failed to parse practice problem JSON:', parseError);
          return NextResponse.json({ error: 'Failed to parse AI response for practice problem' }, { status: 500 });
        }
      }
      case 'generateLearningPath': {
        const { topic, userId } = payload;
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
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 }
          });
          
          const response = await result.response;
          const raw = response.text();
          
          // Clean up the response - look for JSON object
          let jsonStr = raw;
          
          // Remove markdown code fences if present
          const fenceMatch = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
          if (fenceMatch && fenceMatch[1]) {
            jsonStr = fenceMatch[1].trim();
          } else {
            // Otherwise try to extract just the JSON part
            const jsonStartPos = raw.indexOf('{');
            const jsonEndPos = raw.lastIndexOf('}');
            
            if (jsonStartPos >= 0 && jsonEndPos > jsonStartPos) {
              jsonStr = raw.substring(jsonStartPos, jsonEndPos + 1);
            }
          }
          
          // Parse the JSON
          const pathData = JSON.parse(jsonStr);
          return NextResponse.json(pathData);
        } catch (parseError) {
          console.error('Failed to parse learning path JSON:', parseError);
          // Return a fallback learning path so the UI doesn't break
          return NextResponse.json({ 
            title: `Learning Path for ${topic}`,
            steps: [
              { 
                id: 1, 
                title: 'Getting Started', 
                description: `Begin your ${topic} journey with the fundamentals.`,
                difficulty: 'beginner',
                estimatedTime: '1-2 weeks'
              },
              { 
                id: 2, 
                title: 'Core Concepts', 
                description: `Explore essential ${topic} concepts in depth.`,
                difficulty: 'intermediate',
                estimatedTime: '2-3 weeks'
              },
              { 
                id: 3, 
                title: 'Advanced Applications', 
                description: `Apply your ${topic} knowledge to solve complex problems.`,
                difficulty: 'advanced',
                estimatedTime: '3-4 weeks'
              }
            ]
          });
        }
      }
      default:
        return NextResponse.json({ error: 'Invalid API request type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Unhandled API error:', error);
    return NextResponse.json({ 
      error: `API Error: ${error?.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
