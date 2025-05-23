
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-practice-problem.ts';
import '@/ai/flows/evaluate-theory-answer.ts';
import '@/ai/flows/generate-problem-insights.ts'; // Updated import
import '@/ai/flows/generate-blog-post.ts';
