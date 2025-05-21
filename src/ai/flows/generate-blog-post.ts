
// src/ai/flows/generate-blog-post.ts
'use server';

/**
 * @fileOverview Generates a draft blog post based on a topic and optional keywords.
 *
 * - generateBlogPost - A function that handles the blog post generation process.
 * - GenerateBlogPostInput - The input type for the generateBlogPost function.
 * - GenerateBlogPostOutput - The return type for the generateBlogPost function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBlogPostInputSchema = z.object({
  topic: z.string().describe('The main topic for the blog post.'),
  keywords: z.array(z.string()).optional().describe('Optional keywords to focus on for SEO and content direction. E.g., ["study tips", "exam success", "motivation for students"].'),
  targetAudience: z.string().optional().default('students preparing for competitive exams').describe('The primary audience for this blog post.'),
  tone: z.string().optional().default('informative and encouraging').describe('The desired tone for the blog post (e.g., "inspirational", "academic", "practical guide").'),
});
export type GenerateBlogPostInput = z.infer<typeof GenerateBlogPostInputSchema>;

const GenerateBlogPostOutputSchema = z.object({
  title: z.string().describe('A compelling and SEO-friendly title for the blog post.'),
  suggestedSlug: z.string().describe('A URL-friendly slug based on the title (e.g., "effective-learning-strategies").'),
  content: z.string().describe('The full blog post content in Markdown format. It should be well-structured with headings (H2, H3), paragraphs, lists, and potentially bold/italic text for emphasis. Ensure it incorporates the provided keywords naturally. The content should be informative, engaging, and motivational for the target audience. Include a brief introduction and a concluding paragraph.'),
  metaDescription: z.string().describe('A concise meta description (around 150-160 characters) summarizing the blog post for SEO purposes.'),
});
export type GenerateBlogPostOutput = z.infer<typeof GenerateBlogPostOutputSchema>;

export async function generateBlogPost(input: GenerateBlogPostInput): Promise<GenerateBlogPostOutput> {
  return generateBlogPostFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBlogPostPrompt',
  input: {schema: GenerateBlogPostInputSchema},
  output: {schema: GenerateBlogPostOutputSchema},
  prompt: `You are an expert content writer specializing in creating engaging, informative, and motivational blog posts for students, particularly those preparing for competitive exams. Your goal is to produce high-quality, SEO-friendly content.

Generate a blog post based on the following details:
Topic: {{{topic}}}
{{#if keywords}}Keywords to incorporate: {{#each keywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
Target Audience: {{{targetAudience}}}
Desired Tone: {{{tone}}}

Instructions for the output:
1.  **Title**: Create a compelling, clear, and SEO-friendly title for the blog post.
2.  **Suggested Slug**: Generate a URL-friendly slug from the title (e.g., "how-to-study-effectively" from "How to Study Effectively"). Use hyphens and lowercase.
3.  **Content**:
    *   Write the full blog post in **Markdown format**.
    *   The content should be well-structured. Use H2 for main sections and H3 for sub-sections. Do NOT include an H1 (#) heading in the content field, as the 'title' field will be used for that.
    *   Include a brief introduction that grabs the reader's attention and outlines what the post will cover.
    *   Develop the main body with informative and practical advice, insights, or motivational points related to the topic.
    *   If provided, naturally weave the keywords into the content. Do not stuff keywords; prioritize readability and value.
    *   Use paragraphs, bullet points (e.g., * item or - item), or numbered lists where appropriate to make the content easy to read and digest.
    *   Conclude with a summary or a call to action/encouragement.
    *   The overall tone should be {{{tone}}}.
    *   The content should be valuable for {{{targetAudience}}}.
4.  **Meta Description**: Write a concise and engaging meta description (around 150-160 characters) for SEO. This should summarize the post and encourage clicks from search results.

Ensure the Markdown is well-formed.
Example of Markdown structure (for the 'content' field - remember, no H1):
## Introduction
...

## Main Section 1
...

### Sub-section 1.1
...

## Main Section 2
...

## Conclusion
...
`,
});

const generateBlogPostFlow = ai.defineFlow(
  {
    name: 'generateBlogPostFlow',
    inputSchema: GenerateBlogPostInputSchema,
    outputSchema: GenerateBlogPostOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);

