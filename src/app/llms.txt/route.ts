import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export function GET() {
  return new Response(`# Aolbeam AI

> Aolbeam is an AI learning and practice workspace for learners across subjects, including mathematics, science, languages, humanities, business and programming.

Learners enter a topic and choose a difficulty and question format to generate practice questions. They can submit answers for AI feedback, ask the tutor follow-up questions, or create a personal learning path with modules, lessons and checkpoints. Coding is one of many supported study topics.

Practice examples include algebra, physics, biology, English grammar, history, economics, accounting and Python. Questions and explanations are AI-generated; they are not an official exam question bank and may contain errors. Availability is subject to usage limits. Sign-in is required to save and follow learning paths. Personal chats, saved answers and courses are not public resources.

## Learn about the platform

- [Practice guide](${SITE_URL}/practice): Subject examples, question formats, how practice works, and common learner questions.
- [Practice workspace](${SITE_URL}/): Choose a topic and generate practice questions with answer feedback.
- [About Aolbeam](${SITE_URL}/about): Platform purpose and creator.

## Optional

- [Ask](https://ask.aolbeam.com): A related Aolbeam project for AI questions, code inspection and web search from a terminal.
- [Anumana](https://anumana.aolbeam.com): A related Aolbeam MCP project for database query plans and estimated query costs.
- [Contact](${SITE_URL}/contact-us): Get in touch with Aolbeam.
- [Privacy policy](${SITE_URL}/privacy-policy): How learner information is handled.
- [Terms](${SITE_URL}/terms-of-service): Terms for using the service.
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
