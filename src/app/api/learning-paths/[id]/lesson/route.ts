import { NextResponse } from "next/server";
import { z } from "zod";
import { lessonSchema } from "@/lib/learning-paths/schema";
import {
  generateValidated,
  ownedPath,
  PathError,
  pathError,
  pathSession,
  reservePathGeneration,
  saveSteps,
} from "@/lib/learning-paths/server";

export const maxDuration = 120;
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user } = await pathSession();
    const { id } = await context.params;
    const { stepId } = z
      .object({ stepId: z.string().min(1).max(150) })
      .parse(await request.json());
    const path = await ownedPath(supabase, user.id, id);
    const step = path.steps.find((item) => item.id === stepId);
    if (!step) throw new PathError("Module not found.", 404);
    if (step.lesson) return NextResponse.json(path);
    await reservePathGeneration(supabase, user.id, step.title);
    const lesson = await generateValidated(
      `Teach this module in a personalized course.
Course: ${JSON.stringify({ title: path.title, goals: path.goals, outline: path.steps.map((item) => item.title) })}
Module: ${JSON.stringify({ title: step.title, description: step.description, objectives: step.objectives, difficulty: step.difficulty })}
Return {"content":"Markdown lesson of 500–800 words","checkpoint":{"question":"One conceptual MCQ about this lesson","options":["A","B","C","D"],"correctOption":0,"explanation":"Why the correct answer is right"}}.
The lesson must be self-contained: explain each objective, include a concrete worked example with reasoning, common mistakes, a short practice task and a recap. Use Markdown headings and lists, fenced code only if relevant, and LaTeX for math. The checkpoint must have exactly one correct answer; correctOption is its zero-based index. Teach directly; do not just describe what the student should study.`,
      lessonSchema,
      4500,
    );
    const updated = await saveSteps(
      supabase,
      path,
      path.steps.map((item) =>
        item.id === stepId ? { ...item, lesson } : item,
      ),
    );
    return NextResponse.json(updated);
  } catch (error) {
    return pathError(error);
  }
}
