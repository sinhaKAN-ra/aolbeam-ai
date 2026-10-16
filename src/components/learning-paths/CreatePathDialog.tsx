"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Layers3,
  Loader2,
  Route,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { learningPathService } from "@/services/chat-feature/learningPathService";
import type { LearningPath } from "@/types/chat-feature/chat-feature";
import {
  learningGoalSchema,
  type LearningGoalInput,
} from "@/lib/learning-paths/schema";

export default function CreatePathDialog({
  open,
  onOpenChange,
  onCreated,
  initialTopic = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (path: LearningPath) => void;
  initialTopic?: string;
}) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<LearningGoalInput>({
    title: initialTopic,
    description: "",
    difficulty: "beginner",
    estimatedHours: 10,
    topics: [],
  });
  const [topics, setTopics] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const prepare = () => {
    const parsed = learningGoalSchema.safeParse({
      ...goal,
      topics: topics
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setGoal(parsed.data);
    setError("");
    setStep(1);
  };
  const create = async () => {
    if (creating) return;
    setCreating(true);
    setError("");
    try {
      const path = await learningPathService.createCustomLearningPath([
        { ...goal, id: crypto.randomUUID(), priority: "medium" },
      ]);
      onCreated(path);
      onOpenChange(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not create your path. Please try again.",
      );
    } finally {
      setCreating(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!creating) onOpenChange(value);
      }}
    >
      <DialogContent
        className={`max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-3xl sm:max-w-xl sm:rounded-3xl ${creating ? "[&>button]:hidden" : ""}`}
        onInteractOutside={(event) => {
          if (creating) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (creating) event.preventDefault();
        }}
      >
        <DialogHeader>
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Route className="h-5 w-5" />
          </span>
          <DialogTitle className="text-2xl">
            {creating
              ? "Finding your way forward…"
              : step === 0
                ? "Where do you want to go?"
                : "A path that fits your life."}
          </DialogTitle>
          <DialogDescription className="pt-2 leading-relaxed">
            {creating
              ? "Your AI is connecting the dots, ordering the modules, and making room for practice."
              : "Tell us your goal. We’ll turn it into a course you can actually follow."}
          </DialogDescription>
        </DialogHeader>
        {creating ? (
          <div className="py-8" role="status" aria-live="polite">
            <div className="mb-7 flex justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <div className="mx-auto max-w-xs space-y-5">
              {[
                "Start from what you already know",
                "Build a clear, ordered curriculum",
                "Save your course to your workspace",
              ].map((item, index) => (
                <div
                  key={item}
                  className={`animate-rise stagger-${index + 1} flex items-center gap-3 text-sm text-muted-foreground`}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              This can take a minute. Keep this window open.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              step === 0 ? prepare() : void create();
            }}
            className="space-y-5 pt-3"
          >
            <div className="flex gap-2" aria-label={`Step ${step + 1} of 2`}>
              <div className="h-1 flex-1 rounded bg-primary" />
              <div
                className={`h-1 flex-1 rounded ${step === 1 ? "bg-primary" : "bg-muted"}`}
              />
            </div>
            {step === 0 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="path-goal">I want to learn…</Label>
                  <Input
                    autoFocus
                    id="path-goal"
                    value={goal.title}
                    onChange={(event) =>
                      setGoal({ ...goal, title: event.target.value })
                    }
                    placeholder="e.g. Calculus for my entrance exam"
                    required
                    minLength={3}
                    maxLength={160}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="path-context">
                    What would success look like?{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    id="path-context"
                    value={goal.description}
                    onChange={(event) =>
                      setGoal({ ...goal, description: event.target.value })
                    }
                    placeholder="Tell us about your exam, what feels difficult, or what you want to be able to do."
                    maxLength={1500}
                    rows={3}
                  />
                </div>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">
                    My starting point
                  </legend>
                  <div className="grid grid-cols-3 gap-2">
                    {(["beginner", "intermediate", "advanced"] as const).map(
                      (level) => (
                        <button
                          key={level}
                          type="button"
                          aria-pressed={goal.difficulty === level}
                          onClick={() =>
                            setGoal({ ...goal, difficulty: level })
                          }
                          className={`rounded-xl border px-2 py-3 text-xs capitalize transition-colors ${goal.difficulty === level ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                        >
                          {level}
                        </button>
                      ),
                    )}
                  </div>
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                  <div className="space-y-2">
                    <Label htmlFor="path-topics">
                      Focus topics{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="path-topics"
                      value={topics}
                      onChange={(event) => setTopics(event.target.value)}
                      placeholder="Limits, derivatives, integrals"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="path-hours">Study hours</Label>
                    <Input
                      id="path-hours"
                      type="number"
                      min={1}
                      max={200}
                      required
                      value={
                        Number.isNaN(goal.estimatedHours)
                          ? ""
                          : goal.estimatedHours
                      }
                      onChange={(event) =>
                        setGoal({
                          ...goal,
                          estimatedHours: event.target.valueAsNumber,
                        })
                      }
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl border bg-muted/30 p-5">
                  <p className="eyebrow mb-3">Your destination</p>
                  <h3 className="text-xl font-semibold">{goal.title}</h3>
                  {goal.description && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {goal.description}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="capitalize">{goal.difficulty}</span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {goal.estimatedHours} study hours
                    </span>
                  </div>
                  {goal.topics.length > 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Focus: {goal.topics.join(", ")}
                    </p>
                  )}
                </div>
                <div className="space-y-3 px-1">
                  {[
                    {
                      icon: Layers3,
                      text: "A personalized sequence of 4–9 modules",
                    },
                    {
                      icon: Sparkles,
                      text: "Clear lessons, worked examples and practice",
                    },
                    {
                      icon: Check,
                      text: "Checkpoints and progress saved as you go",
                    },
                  ].map((item) => (
                    <div
                      key={item.text}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <item.icon className="h-4 w-4 text-primary" />
                      {item.text}
                    </div>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  The outline is generated now. Each lesson is created when you
                  start its module and saved for revisiting.
                </p>
              </>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <div className="flex items-center justify-between gap-3 border-t pt-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => (step ? setStep(0) : onOpenChange(false))}
              >
                {step ? (
                  <>
                    <ArrowLeft />
                    Back
                  </>
                ) : (
                  "Cancel"
                )}
              </Button>
              <Button type="submit">
                {step ? (
                  <>
                    <Sparkles />
                    Create my path
                  </>
                ) : (
                  <>
                    Review my goal
                    <ArrowRight />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
