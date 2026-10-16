import { z } from "zod";

export const learningGoalSchema = z.object({
  title: z.string().trim().min(3, "Describe what you want to learn.").max(160),
  description: z.string().trim().max(1500).default(""),
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .default("beginner"),
  estimatedHours: z.number().int().min(1).max(200).default(10),
  topics: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
});
export const createPathSchema = z.object({
  goals: z.array(learningGoalSchema).min(1).max(5),
});
export type LearningGoalInput = z.infer<typeof learningGoalSchema>;
export const outlineSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(15).max(1500),
  steps: z
    .array(
      z.object({
        title: z.string().trim().min(3).max(200),
        description: z.string().trim().min(10).max(1200),
        estimatedMinutes: z.number().int().min(10).max(600),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]),
        objectives: z.array(z.string().min(3).max(300)).min(2).max(5),
      }),
    )
    .min(4)
    .max(9),
});
export const lessonSchema = z.object({
  content: z.string().min(400).max(18000),
  checkpoint: z.object({
    question: z.string().min(10).max(1000),
    options: z.array(z.string().min(1).max(500)).length(4),
    correctOption: z.number().int().min(0).max(3),
    explanation: z.string().min(10).max(1500),
  }),
});
export type LearningLesson = z.infer<typeof lessonSchema>;

export const manualModuleSchema = z
  .object({
    title: z.string().trim().min(3, "Give this module a title.").max(200),
    description: z
      .string()
      .trim()
      .min(10, "Describe what you want to learn in a little more detail.")
      .max(1200),
    objectives: z
      .array(z.string().trim().min(3).max(300))
      .min(1, "Add at least one learning objective.")
      .max(5),
    estimatedMinutes: z.number().int().min(10).max(600),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    afterStepId: z.string().min(1).max(150).optional(),
  })
  .strict();
export type ManualModuleInput = z.infer<typeof manualModuleSchema>;
