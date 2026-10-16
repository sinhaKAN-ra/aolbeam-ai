import { NextResponse } from "next/server";
import { createPathSchema, outlineSchema } from "@/lib/learning-paths/schema";
import {
  generateValidated,
  pathError,
  pathSession,
  reservePathGeneration,
} from "@/lib/learning-paths/server";

export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    const { supabase, user } = await pathSession();
    const { goals } = createPathSchema.parse(await request.json());
    await reservePathGeneration(supabase, user.id, goals[0].title);
    const outline = await generateValidated(
      `Create a personalized, achievable course with 4–9 ordered modules for these learner goals: ${JSON.stringify(goals)}.
Honor ALL goals, prior level, focus topics, and the TOTAL available hours (sum of estimatedHours). Start from prerequisites appropriate to that level, build toward application and finish with review or a capstone. Module titles and objectives must be specific to the subject. Distribute the available time realistically. Return this exact JSON structure:
{"title":"Course title","description":"What the learner will be able to do","steps":[{"title":"Specific module","description":"What and why","estimatedMinutes":45,"difficulty":"beginner","objectives":["Measurable outcome","Measurable outcome"]}]}. Difficulty is beginner, intermediate or advanced. No external links.`,
      outlineSchema,
      3500,
    );
    const steps = outline.steps.map((step, index) => ({
      ...step,
      id: crypto.randomUUID(),
      order: index,
      completed: false,
      resources: [],
      estimatedTime: `${step.estimatedMinutes} min`,
    }));
    const { data, error } = await supabase
      .from("learning_paths")
      .insert({
        title: outline.title,
        description: outline.description,
        topic: goals[0].title,
        main_topic: goals[0].title,
        user_id: user.id,
        steps,
        current_step: 0,
        total_steps: steps.length,
        estimated_hours: goals.reduce(
          (sum, goal) => sum + goal.estimatedHours,
          0,
        ),
        difficulty: goals[0].difficulty,
        goals: goals.map(
          (goal) =>
            `${goal.title}${goal.description ? ": " + goal.description : ""}`,
        ),
        is_custom_path: true,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return pathError(error);
  }
}
