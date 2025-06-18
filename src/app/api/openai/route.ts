// import { NextResponse } from 'next/server';
// import OpenAI from 'openai';

// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// if (!OPENAI_API_KEY) {
//   throw new Error('OPENAI_API_KEY is not set in environment variables');
// }

// const openai = new OpenAI({
//   apiKey: OPENAI_API_KEY,
// });

// export async function POST(req: Request) {
//   try {
//     const { type, payload } = await req.json();

//     switch (type) {
//       case 'generateLearningContext': {
//         const { topic } = payload;
//         const prompt = `Provide a concise learning context about ${topic} for a student. Include key concepts and why they're important.`;
        
//         const response = await openai.chat.completions.create({
//           model: "gpt-3.5-turbo",
//           messages: [
//             { role: "system", content: "You are an educational AI that provides concise, informative learning content structured in markdown format." },
//             { role: "user", content: prompt }
//           ],
//         });
        
//         return NextResponse.json({ text: response.choices[0].message.content });
//       }
      
//       case 'generateTopicSuggestions': {
//         const { topic, count } = payload;
//         const prompt = `Generate ${count} related learning topics about ${topic}. For each, provide a title, brief description, and difficulty level (beginner, intermediate, advanced). Format as JSON array.`;
        
//         const response = await openai.chat.completions.create({
//           model: "gpt-3.5-turbo",
//           messages: [
//             { role: "system", content: "You are an educational AI that generates structured JSON data without markdown code fences." },
//             { role: "user", content: prompt }
//           ],
//           response_format: { type: "json_object" }
//         });
        
//         try {
//           const content = response.choices[0].message.content;
//           const jsonContent = JSON.parse(content);
//           return NextResponse.json({ suggestions: jsonContent.suggestions || jsonContent });
//         } catch (parseError) {
//           console.error('Failed to parse topic suggestions JSON:', parseError);
//           return NextResponse.json({ error: 'Failed to parse AI response for topic suggestions' }, { status: 500 });
//         }
//       }
      
//       case 'generatePracticeProblem': {
//         const { topic } = payload;
//         const prompt = `Create a practice problem about ${topic} with a question, multiple choice options, correct answer, and explanation. Format as JSON.`;
        
//         const response = await openai.chat.completions.create({
//           model: "gpt-3.5-turbo",
//           messages: [
//             { role: "system", content: "You are an educational AI that generates structured practice problems in JSON format without markdown code fences." },
//             { role: "user", content: prompt }
//           ],
//           response_format: { type: "json_object" }
//         });
        
//         try {
//           const content = response.choices[0].message.content;
//           const jsonContent = JSON.parse(content);
//           return NextResponse.json({ problem: jsonContent.problem || jsonContent });
//         } catch (parseError) {
//           console.error('Failed to parse practice problem JSON:', parseError);
//           return NextResponse.json({ error: 'Failed to parse AI response for practice problem' }, { status: 500 });
//         }
//       }
      
//       case 'generateLearningPath': {
//         const { topic, userId } = payload;
//         const prompt = `Generate a detailed learning path for the topic "${topic}" suitable for a student. 
//         The learning path should include:
//         1. A title
//         2. 5-7 sequential steps that build knowledge progressively
//         3. Each step should have: an id, title, description, difficulty level, and estimated time to complete (in weeks)
//         4. Include a mix of fundamentals, practical applications, and advanced concepts
//         5. Format as JSON with proper structure`;
        
//         const response = await openai.chat.completions.create({
//           model: "gpt-3.5-turbo",
//           messages: [
//             { role: "system", content: "You are an educational AI that creates structured learning paths in JSON format without markdown code fences." },
//             { role: "user", content: prompt }
//           ],
//           response_format: { type: "json_object" }
//         });
        
//         try {
//           const content = response.choices[0].message.content;
//           const pathData = JSON.parse(content);
//           return NextResponse.json(pathData);
//         } catch (parseError) {
//           console.error('Failed to parse learning path JSON:', parseError);
//           return NextResponse.json({ 
//             error: 'Failed to parse AI response for learning path', 
//             raw: response.choices[0].message.content 
//           }, { status: 500 });
//         }
//       }
      
//       default:
//         return NextResponse.json({ error: 'Invalid API type' }, { status: 400 });
//     }
//   } catch (error) {
//     console.error('OpenAI API error:', error);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }
