"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Trophy,
  Plus,
} from "lucide-react";
import type { LearningPath } from "@/types/chat-feature/chat-feature";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ChatMarkdown from "@/components/chat-feature/ChatMarkdown";
import { learningPathService } from "@/services/chat-feature/learningPathService";

import AddModuleDialog from "./AddModuleDialog";
import { LEARNING_PATH_MAX_MODULES } from "@/config/limits";

export default function PathWorkspace({
  path,
  onBack,
  onUpdate,
  onRefresh,
}: {
  path: LearningPath;
  onBack: () => void;
  onUpdate: (path: LearningPath) => void;
  onRefresh: () => void;
}) {
  const [addingModule, setAddingModule] = useState(false);
  const [activeId, setActiveId] = useState(
    () => (path.steps.find((step) => !step.completed) || path.steps[0])?.id,
  );
  const [busy, setBusy] = useState<"lesson" | "progress" | null>(null);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const active =
    path.steps.find((step) => step.id === activeId) || path.steps[0];
  const activeIndex = path.steps.findIndex((step) => step.id === active?.id);
  const complete = path.steps.filter((step) => step.completed).length;
  const progress = path.steps.length
    ? Math.round((complete / path.steps.length) * 100)
    : 0;
  useEffect(() => {
    setAnswer(null);
    setChecked(false);
    setError("");
  }, [activeId]);
  const choose = (id: string) => {
    if (busy) return;
    setActiveId(id);
  };
  const loadLesson = async () => {
    if (!active || busy) return;
    setBusy("lesson");
    setError("");
    try {
      onUpdate(await learningPathService.loadLesson(path.id, active.id));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not load this lesson. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  };
  const markComplete = async (completed: boolean) => {
    if (!active || busy) return;
    setBusy("progress");
    setError("");
    try {
      onUpdate(
        await learningPathService.updateProgress(
          path.id,
          active.id,
          completed,
          answer ?? undefined,
        ),
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not save progress. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  };
  const nextModule =
    path.steps[activeIndex + 1] ||
    path.steps.find((step) => !step.completed && step.id !== active?.id);
  const next = () => {
    if (nextModule) {
      choose(nextModule.id);
      contentRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };
  const checkpoint = active?.lesson?.checkpoint;
  const correct = checked && answer === checkpoint?.correctOption;
  const tutorQuestion = `I am studying the course "${path.title}", module "${active?.title}". The learning objectives are ${(active?.objectives || [active?.description]).join("; ")}. Help me understand this topic with an example and guide me through practice.`;
  return (
    <div className="page-shell">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All learning paths
      </button>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <p className="eyebrow mb-3">Your personal course</p>
          <h1 className="section-title">{path.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {path.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>{path.steps.length} modules</span>
            {path.estimated_hours && (
              <span className="flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {path.estimated_hours} study hours
              </span>
            )}
            <span className="capitalize">
              {path.difficulty || "Self-paced"}
            </span>
          </div>
        </div>
        <div className="w-full rounded-2xl border bg-card p-4 sm:w-52">
          <div className="mb-3 flex justify-between text-xs">
            <span className="text-muted-foreground">Your progress</span>
            <span className="font-semibold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
          <p className="mt-3 text-[11px] text-muted-foreground">
            {complete} of {path.steps.length} modules complete
          </p>
        </div>
      </div>
      {progress === 100 && (
        <div
          role="status"
          className="mb-7 flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5"
        >
          <Trophy className="h-8 w-8 text-primary" />
          <div>
            <h2 className="font-semibold">Look how far you’ve come.</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You’ve completed every module. Revisit any lesson to keep it
              fresh.
            </p>
          </div>
        </div>
      )}
      {addingModule && (
        <AddModuleDialog
          path={path}
          onClose={() => setAddingModule(false)}
          onAdded={(updated, stepId) => {
            onUpdate(updated);
            setActiveId(stepId);
          }}
        />
      )}
      {!active ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <p>
            This path has no modules yet. Add a topic to start building your
            course.
          </p>
          <Button className="mt-4" onClick={() => setAddingModule(true)}>
            <Plus />
            Add your first module
          </Button>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="rounded-2xl border bg-card lg:sticky lg:top-24">
            <div className="border-b px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow">Course roadmap</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddingModule(true)}
                  disabled={
                    !!busy || path.steps.length >= LEARNING_PATH_MAX_MODULES
                  }
                  aria-label="Add a module"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>
            <nav
              aria-label="Course modules"
              className="max-h-[360px] space-y-1 overflow-y-auto p-2 lg:max-h-[calc(100dvh-15rem)]"
            >
              {path.steps.map((step, index) => (
                <button
                  key={step.id}
                  disabled={!!busy}
                  aria-current={active.id === step.id ? "step" : undefined}
                  onClick={() => choose(step.id)}
                  className={`group flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors disabled:opacity-60 ${active.id === step.id ? "bg-primary/[0.07]" : "hover:bg-muted/60"}`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${step.completed ? "bg-primary text-primary-foreground" : active.id === step.id ? "border border-primary text-primary" : "border text-muted-foreground"}`}
                  >
                    {step.completed ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-xs font-medium leading-5 ${active.id === step.id ? "text-primary" : ""}`}
                    >
                      {step.title}
                      {step.source === "manual" && (
                        <span className="ml-1.5 text-[9px] font-normal text-muted-foreground">
                          Added by you
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {step.completed
                        ? "Completed"
                        : step.estimatedTime || "Self-paced lesson"}
                    </span>
                  </span>
                  {active.id === step.id && (
                    <ChevronRight className="mt-1.5 h-3 w-3 text-primary" />
                  )}
                </button>
              ))}
            </nav>
            <div className="border-t p-3">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setAddingModule(true)}
                disabled={
                  !!busy || path.steps.length >= LEARNING_PATH_MAX_MODULES
                }
              >
                <Plus />
                Add a module
              </Button>
              {path.steps.length >= LEARNING_PATH_MAX_MODULES && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  This path has reached its module limit.
                </p>
              )}
            </div>
          </aside>
          <div ref={contentRef} className="min-w-0 scroll-mt-24 space-y-5">
            <article
              key={active.id}
              className="animate-rise overflow-hidden rounded-2xl border bg-card"
            >
              <header className="border-b bg-muted/20 p-6 sm:p-8">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="eyebrow">
                    Module {String(activeIndex + 1).padStart(2, "0")} /{" "}
                    {String(path.steps.length).padStart(2, "0")}
                  </p>
                  {active.completed && (
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Complete
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-semibold">{active.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {active.description}
                </p>
              </header>
              <div className="p-6 sm:p-8">
                {active.objectives?.length ? (
                  <div className="mb-8 rounded-xl border bg-background/60 p-4">
                    <h3 className="mb-3 text-xs font-semibold">
                      By the end, you’ll be able to
                    </h3>
                    <ul className="space-y-2.5">
                      {active.objectives.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"
                        >
                          <Check className="mt-0.5 h-3.5 w-3.5 text-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {active.lesson ? (
                  <ChatMarkdown content={active.lesson.content} />
                ) : (
                  <div className="rounded-2xl border border-dashed p-7 text-center">
                    <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <h3 className="text-lg font-semibold">
                      Let’s make this concept click.
                    </h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                      Get a guided lesson with a worked example, common
                      mistakes, and a quick understanding check.
                    </p>
                    <Button
                      className="mt-5"
                      onClick={loadLesson}
                      disabled={!!busy}
                    >
                      {busy === "lesson" ? (
                        <>
                          <Loader2 className="animate-spin" />
                          Preparing your lesson…
                        </>
                      ) : (
                        <>
                          <Sparkles />
                          Start this module
                        </>
                      )}
                    </Button>
                    {busy === "lesson" && (
                      <p
                        role="status"
                        className="mt-3 text-xs text-muted-foreground"
                      >
                        Your lesson will be saved here. This can take a minute.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </article>
            {checkpoint && (
              <section
                className="rounded-2xl border bg-card p-6 sm:p-8"
                aria-label="Module checkpoint"
              >
                <p className="eyebrow mb-3">Pause & check</p>
                <h3 className="text-lg font-semibold">{checkpoint.question}</h3>
                <fieldset
                  disabled={active.completed || !!busy}
                  className="mt-5 space-y-2"
                >
                  <legend className="sr-only">Choose one answer</legend>
                  {checkpoint.options.map((option, index) => (
                    <label
                      key={index}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors ${answer === index ? "border-primary bg-primary/5" : "hover:bg-muted/40"} ${checked && index === checkpoint.correctOption ? "border-primary" : ""}`}
                    >
                      <input
                        className="mt-1 accent-[hsl(var(--primary))]"
                        type="radio"
                        name={`checkpoint-${active.id}`}
                        checked={
                          answer === index ||
                          (active.completed &&
                            index === checkpoint.correctOption)
                        }
                        onChange={() => {
                          setAnswer(index);
                          setChecked(false);
                        }}
                      />
                      <span className="flex-1 leading-6">{option}</span>
                    </label>
                  ))}
                </fieldset>
                {checked && (
                  <div
                    role="status"
                    className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${correct ? "border-primary/20 bg-primary/5" : "bg-muted/40"}`}
                  >
                    <p className="mb-1 font-semibold">
                      {correct ? "You’ve got it." : "Take another look."}
                    </p>
                    {checkpoint.explanation}
                  </div>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  {active.completed ? (
                    <>
                      <span className="flex items-center gap-2 text-sm text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                        Progress saved
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-muted-foreground"
                        onClick={() => markComplete(false)}
                        disabled={!!busy}
                      >
                        <RotateCcw />
                        Mark incomplete
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        disabled={answer === null || !!busy}
                        onClick={() => setChecked(true)}
                      >
                        Check my understanding
                      </Button>
                      {correct && (
                        <Button
                          onClick={() => markComplete(true)}
                          disabled={!!busy}
                        >
                          {busy === "progress" ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Check />
                          )}
                          Complete module
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
              >
                <p>{error}</p>
                <Button
                  className="mt-3"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError("");
                    onRefresh();
                  }}
                >
                  Refresh saved path
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <Button asChild variant="outline">
                <Link
                  href={`/chat/${crypto.randomUUID()}?q=${encodeURIComponent(tutorQuestion)}`}
                >
                  <MessageSquare />
                  Ask my tutor
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link
                  href={`/?topic=${encodeURIComponent(`${path.main_topic}: ${active.title}`)}&generate=1`}
                >
                  <BookOpen />
                  Extra practice
                </Link>
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => choose(path.steps[activeIndex - 1].id)}
                  disabled={activeIndex === 0 || !!busy}
                >
                  <ArrowLeft />
                  Previous
                </Button>
                <Button
                  size="sm"
                  onClick={next}
                  disabled={!!busy || !nextModule}
                >
                  Next module
                  <ArrowRight />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
