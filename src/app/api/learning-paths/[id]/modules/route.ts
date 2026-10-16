import { NextResponse } from "next/server";
import { LEARNING_PATH_MAX_MODULES } from "@/config/limits";
import { manualModuleSchema } from "@/lib/learning-paths/schema";
import {
  ownedPath,
  pathError,
  PathError,
  pathSession,
  saveSteps,
} from "@/lib/learning-paths/server";
import type { LearningStep } from "@/types/chat-feature/chat-feature";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user } = await pathSession();
    const { id } = await context.params;
    const input = manualModuleSchema.parse(await request.json());
    const path = await ownedPath(supabase, user.id, id);
    if (path.steps.length >= LEARNING_PATH_MAX_MODULES)
      throw new PathError(
        `A path can have up to ${LEARNING_PATH_MAX_MODULES} modules.`,
        422,
      );
    const afterIndex = input.afterStepId
      ? path.steps.findIndex((step) => step.id === input.afterStepId)
      : path.steps.length - 1;
    if (input.afterStepId && afterIndex === -1)
      throw new PathError(
        "The module you selected has changed. Refresh this path and try again.",
        409,
      );
    const step: LearningStep = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      objectives: input.objectives,
      estimatedMinutes: input.estimatedMinutes,
      estimatedTime: `${input.estimatedMinutes} min`,
      difficulty: input.difficulty,
      completed: false,
      resources: [],
      source: "manual",
    };
    const steps = [...path.steps];
    steps.splice(afterIndex + 1, 0, step);
    const previousMinutes =
      path.steps.reduce((sum, item) => sum + (item.estimatedMinutes || 0), 0) ||
      (path.estimated_hours || 0) * 60;
    const updated = await saveSteps(
      supabase,
      path,
      steps.map((item, order) => ({ ...item, order })),
      {
        estimated_hours: Math.ceil(
          (previousMinutes + input.estimatedMinutes) / 60,
        ),
      },
    );
    return NextResponse.json(
      { path: updated, stepId: step.id },
      { status: 201 },
    );
  } catch (error) {
    return pathError(error);
  }
}
