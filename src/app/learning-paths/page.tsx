"use client";
import { useAppRouter } from "@/hooks/useAppRouter";

import { Suspense, useState } from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Ellipsis,
  Loader2,
  Pencil,
  Plus,
  Route,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { learningPathService } from "@/services/chat-feature/learningPathService";
import type { LearningPath } from "@/types/chat-feature/chat-feature";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CreatePathDialog from "@/components/learning-paths/CreatePathDialog";
import PathWorkspace from "@/components/learning-paths/PathWorkspace";

function LearningPathsContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useAppRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const queryKey = ["learning-paths", user?.id];
  const [creating, setCreating] = useState(false);
  const [initialTopic, setInitialTopic] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<LearningPath | null>(null);
  const [title, setTitle] = useState("");
  const [deleting, setDeleting] = useState<LearningPath | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const {
    data: paths = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => learningPathService.getUserLearningPaths(),
    enabled: !!user,
    retry: 1,
  });
  const select = (id?: string) =>
    router.push(
      id ? `/learning-paths?path=${encodeURIComponent(id)}` : "/learning-paths",
      { scroll: false },
    );
  const update = (path: LearningPath) =>
    queryClient.setQueryData<LearningPath[]>(queryKey, (previous) =>
      previous?.some((item) => item.id === path.id)
        ? previous.map((item) => (item.id === path.id ? path : item))
        : [path, ...(previous || [])],
    );
  const startCreate = (topic = "") => {
    setInitialTopic(topic);
    setCreating(true);
  };
  const completeCount = paths.filter(
    (path) =>
      path.steps.length > 0 && path.steps.every((step) => step.completed),
  ).length;
  const modulesDone = paths.reduce(
    (sum, path) => sum + path.steps.filter((step) => step.completed).length,
    0,
  );
  const selectedId = params?.get("path");
  const selected = paths.find((path) => path.id === selectedId);
  const visible = paths.filter((path) => {
    const done =
      path.steps.length > 0 && path.steps.every((step) => step.completed);
    return (
      (filter === "all" || (filter === "completed" ? done : !done)) &&
      `${path.title} ${path.description}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });
  async function rename(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setActionError("");
    try {
      update(
        await learningPathService.saveLearningPath({
          ...editing,
          title: title.trim(),
        }),
      );
      setEditing(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not rename path.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setActionError("");
    try {
      await learningPathService.deleteLearningPath(deleting.id);
      queryClient.setQueryData<LearningPath[]>(queryKey, (previous) =>
        previous?.filter((path) => path.id !== deleting.id),
      );
      setDeleting(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not delete path.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (authLoading) return <PathLoading />;
  if (!user)
    return (
      <div className="page-shell py-20 text-center">
        <Route className="mx-auto mb-5 h-10 w-10 text-primary" />
        <h1 className="section-title">Your goals deserve a clear path.</h1>
        <p className="my-5 text-muted-foreground">
          Sign in to create courses and save your progress.
        </p>
        <Button asChild>
          <Link href="/login?redirect=/learning-paths">
            Sign in to get started
            <ArrowRight />
          </Link>
        </Button>
      </div>
    );
  return (
    <>
      {selected ? (
        <PathWorkspace
          key={selected.id}
          path={selected}
          onBack={() => select()}
          onUpdate={update}
          onRefresh={() => {
            void refetch();
          }}
        />
      ) : (
        <div className="page-shell">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="eyebrow mb-3">
                A little direction changes everything
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Your learning paths<span className="text-primary">.</span>
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Turn a big “I want to learn” into a small “I did it.”
              </p>
            </div>
            <Button onClick={() => startCreate()}>
              <Plus />
              Create a learning path
            </Button>
          </header>
          {selectedId && !isLoading && !error && (
            <div role="alert" className="mb-5 rounded-xl border p-4 text-sm">
              This path isn’t in your account.{" "}
              <Button variant="link" size="sm" onClick={() => select()}>
                View your paths
              </Button>
            </div>
          )}
          <div className="mb-8 grid grid-cols-3 divide-x rounded-2xl border bg-card py-5">
            {[
              { label: "Learning paths", value: paths.length, icon: Route },
              {
                label: "Modules completed",
                value: modulesDone,
                icon: BookOpen,
              },
              {
                label: "Paths completed",
                value: completeCount,
                icon: CheckCircle2,
              },
            ].map((item) => (
              <div key={item.label} className="px-4 sm:px-6">
                <item.icon className="mb-3 h-4 w-4 text-primary" />
                <p className="text-2xl font-semibold">
                  {isLoading || error ? "—" : item.value}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div
              className="flex gap-1 rounded-xl border bg-card p-1"
              aria-label="Filter paths"
            >
              {[
                { id: "all", title: "All paths" },
                { id: "active", title: "In progress" },
                { id: "completed", title: "Completed" },
              ].map((item) => (
                <button
                  key={item.id}
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${filter === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {item.title}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search learning paths"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find a path…"
                className="bg-card pl-9"
              />
            </div>
          </div>
          {isLoading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl border bg-card p-10 text-center"
            >
              <h2 className="text-lg font-semibold">
                We couldn’t load your learning paths.
              </h2>
              <p className="my-3 text-sm text-muted-foreground">
                {error.message}
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : paths.length === 0 ? (
            <section className="grid overflow-hidden rounded-3xl border bg-card md:grid-cols-[1.15fr_1fr]">
              <div className="p-7 sm:p-10">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Route className="h-6 w-6" />
                </div>
                <p className="eyebrow mb-3">Start with a destination</p>
                <h2 className="max-w-md text-3xl font-semibold leading-tight">
                  You bring the ambition.
                  <br />
                  We’ll bring the roadmap.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
                  Tell your AI what you want to master. Get a personalized
                  course, work through each lesson, and watch your progress add
                  up.
                </p>
                <Button className="mt-6" onClick={() => startCreate()}>
                  <Sparkles />
                  Create my first path
                </Button>
              </div>
              <div className="border-t bg-primary/[0.035] p-7 sm:p-10 md:border-l md:border-t-0">
                <p className="eyebrow mb-6">How your journey unfolds</p>
                {[
                  {
                    title: "Set a goal",
                    text: "Your subject, starting point and available time.",
                  },
                  {
                    title: "Get your roadmap",
                    text: "An AI course built around what you need.",
                  },
                  {
                    title: "Learn. Practice. Progress.",
                    text: "Guided lessons, checkpoints and a clear next step.",
                  },
                ].map((item, index) => (
                  <div
                    key={item.title}
                    className="relative flex gap-4 pb-8 last:pb-0"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-card text-xs font-semibold text-primary">
                      0{index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      <p className="mt-2 text-xs leading-6 text-muted-foreground">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : visible.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((path, index) => {
                const completed = path.steps.filter(
                  (step) => step.completed,
                ).length;
                const progress = path.steps.length
                  ? Math.round((completed / path.steps.length) * 100)
                  : 0;
                return (
                  <article
                    key={path.id}
                    className="animate-rise group flex flex-col rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                  >
                    <div
                      className={`h-2 rounded-t-2xl ${index % 3 === 1 ? "bg-violet-400/30" : index % 3 === 2 ? "bg-amber-400/30" : "bg-primary/25"}`}
                    />
                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-5 flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Route className="h-4 w-4" />
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Manage ${path.title}`}
                            >
                              <Ellipsis />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setActionError("");
                                setEditing(path);
                                setTitle(path.title);
                              }}
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setActionError("");
                                setDeleting(path);
                              }}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete path
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <h2 className="text-lg font-semibold leading-snug">
                        <button
                          onClick={() => select(path.id)}
                          className="text-left hover:text-primary"
                        >
                          {path.title}
                        </button>
                      </h2>
                      <p className="mb-5 mt-2 line-clamp-2 text-xs leading-6 text-muted-foreground">
                        {path.description}
                      </p>
                      <div className="mb-5 mt-auto flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        <span>{path.steps.length} modules</span>
                        {path.estimated_hours && (
                          <span className="flex items-center gap-1">
                            <Clock3 className="h-3 w-3" />
                            {path.estimated_hours} hours
                          </span>
                        )}
                        <span className="capitalize">
                          {path.difficulty || "Self-paced"}
                        </span>
                      </div>
                      <div className="mb-2 flex justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          {completed}/{path.steps.length} complete
                        </span>
                        <span className="font-medium text-primary">
                          {progress}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                      <Button
                        variant="outline"
                        className="mt-5 w-full justify-between"
                        onClick={() => select(path.id)}
                      >
                        {progress === 100
                          ? "Revisit your course"
                          : completed
                            ? "Keep learning"
                            : "Explore your course"}
                        <ArrowRight />
                      </Button>
                    </div>
                  </article>
                );
              })}
              <button
                onClick={() => startCreate()}
                className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-card/30 p-8 transition-colors hover:border-primary hover:bg-primary/5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border bg-card">
                  <Plus className="h-4 w-4 text-primary" />
                </span>
                <span className="text-sm font-medium">
                  A new goal, a new path
                </span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-14 text-center">
              <Search className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
              <h2 className="font-semibold">No paths here yet.</h2>
              <p className="my-3 text-sm text-muted-foreground">
                Try another search or filter.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Show all paths
              </Button>
            </div>
          )}
          {!paths.length && !isLoading && !error && (
            <div className="mt-8">
              <p className="eyebrow mb-4">Need a spark? Start here</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Calculus fundamentals",
                  "Python from scratch",
                  "Organic chemistry",
                  "Data structures for interviews",
                ].map((topic) => (
                  <Button
                    key={topic}
                    variant="outline"
                    className="bg-card text-xs"
                    onClick={() => startCreate(topic)}
                  >
                    {topic}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {creating && (
        <CreatePathDialog
          open={creating}
          onOpenChange={setCreating}
          initialTopic={initialTopic}
          onCreated={(path) => {
            update(path);
            select(path.id);
          }}
        />
      )}
      <Dialog
        open={!!editing}
        onOpenChange={(value) => {
          if (!value && !busy) setEditing(null);
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Give your path a name</DialogTitle>
            <DialogDescription>
              Choose something that reminds you where you’re headed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={rename} className="space-y-4">
            <Input
              aria-label="Learning path name"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={3}
              maxLength={200}
            />
            {actionError && (
              <p role="alert" className="text-sm text-destructive">
                {actionError}
              </p>
            )}
            <Button type="submit" disabled={busy || title.trim().length < 3}>
              {busy && <Loader2 className="animate-spin" />}Save name
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleting}
        onOpenChange={(value) => {
          if (!value && !busy) setDeleting(null);
        }}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this learning path?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” and its saved lessons and progress will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionError && (
            <p role="alert" className="text-sm text-destructive">
              {actionError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep my path</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete
              path
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
function PathLoading() {
  return (
    <div className="page-shell space-y-7">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
export default function LearningPathsPage() {
  return (
    <Suspense fallback={<PathLoading />}>
      <LearningPathsContent />
    </Suspense>
  );
}
