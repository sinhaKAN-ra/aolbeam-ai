import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ownedPath,
  PathError,
  pathError,
  pathSession,
  saveSteps,
} from "@/lib/learning-paths/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user } = await pathSession();
    const { id } = await context.params;
    const input = z
      .object({
        stepId: z.string().min(1).max(150),
        completed: z.boolean(),
        answer: z.number().int().min(0).max(3).optional(),
      })
      .parse(await request.json());
    const path = await ownedPath(supabase, user.id, id);
    const step = path.steps.find((item) => item.id === input.stepId);
    if (!step) throw new PathError("Module not found.", 404);
    if (
      input.completed &&
      (!step.lesson || input.answer !== step.lesson.checkpoint.correctOption)
    )
      throw new PathError(
        "Complete the lesson checkpoint before finishing this module.",
        422,
      );
    const updated = await saveSteps(
      supabase,
      path,
      path.steps.map((item) =>
        item.id === input.stepId
          ? {
              ...item,
              completed: input.completed,
              completedAt: input.completed
                ? new Date().toISOString()
                : undefined,
            }
          : item,
      ),
    );
    return NextResponse.json(updated);
  } catch (error) {
    return pathError(error);
  }
}
