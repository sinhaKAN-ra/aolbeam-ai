// src/ai/flows/fetch-topic-details.ts
'use server';

/**
 * @fileOverview Fetches topic details from the internet to assist with revision.
 *
 * - fetchTopicDetails - A function that handles the topic details retrieval process.
 * - FetchTopicDetailsInput - The input type for the fetchTopicDetails function.
 * - FetchTopicDetailsOutput - The return type for the fetchTopicDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FetchTopicDetailsInputSchema = z.object({
  topic: z.string().describe('The topic to fetch details for.'),
});
export type FetchTopicDetailsInput = z.infer<typeof FetchTopicDetailsInputSchema>;

const FetchTopicDetailsOutputSchema = z.object({
  details: z.string().describe('The details of the topic.'),
});
export type FetchTopicDetailsOutput = z.infer<typeof FetchTopicDetailsOutputSchema>;

export async function fetchTopicDetails(input: FetchTopicDetailsInput): Promise<FetchTopicDetailsOutput> {
  return fetchTopicDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'fetchTopicDetailsPrompt',
  input: {schema: FetchTopicDetailsInputSchema},
  output: {schema: FetchTopicDetailsOutputSchema},
  prompt: `You are a helpful AI assistant. The user will provide you with a topic, and you will respond with details about the topic.

Topic: {{{topic}}}

Details: `,
});

const fetchTopicDetailsFlow = ai.defineFlow(
  {
    name: 'fetchTopicDetailsFlow',
    inputSchema: FetchTopicDetailsInputSchema,
    outputSchema: FetchTopicDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
