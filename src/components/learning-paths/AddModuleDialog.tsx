"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import type { LearningPath } from "@/types/chat-feature/chat-feature";
import {
  manualModuleSchema,
  type ManualModuleInput,
} from "@/lib/learning-paths/schema";
import { learningPathService } from "@/services/chat-feature/learningPathService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AddModuleDialog({
  path,
  onClose,
  onAdded,
}: {
  path: LearningPath;
  onClose: () => void;
  onAdded: (path: LearningPath, stepId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState("");
  const [minutes, setMinutes] = useState(45);
  const [difficulty, setDifficulty] =
    useState<ManualModuleInput["difficulty"]>("beginner");
  const [afterStepId, setAfterStepId] = useState("end");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const parsed = manualModuleSchema.safeParse({
      title,
      description,
      objectives: objectives
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      estimatedMinutes: minutes,
      difficulty,
      ...(afterStepId !== "end" ? { afterStepId } : {}),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await learningPathService.addModule(path.id, parsed.data);
      onAdded(result.path, result.stepId);
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not add your module. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"
        onEscapeKeyDown={(event) => {
          if (saving) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (saving) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Make room for something new.
          </DialogTitle>
          <DialogDescription className="pt-2 leading-relaxed">
            Add a module from your syllabus or a topic you want to explore. Your
            tutor can prepare its lesson when you start.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <fieldset disabled={saving} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="module-title">Module title</Label>
              <Input
                autoFocus
                id="module-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Applications of integration"
                required
                minLength={3}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-description">
                What should this module cover?
              </Label>
              <Textarea
                id="module-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the concepts, examples or skills you want to include."
                required
                minLength={10}
                maxLength={1200}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-objectives">Learning objectives</Label>
              <Textarea
                id="module-objectives"
                value={objectives}
                onChange={(event) => setObjectives(event.target.value)}
                placeholder={
                  "Find the area under a curve\nApply integrals to a real-world problem"
                }
                required
                maxLength={1504}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                One outcome per line, up to five.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="module-minutes">Study time (minutes)</Label>
                <Input
                  id="module-minutes"
                  type="number"
                  required
                  min={10}
                  max={600}
                  value={Number.isNaN(minutes) ? "" : minutes}
                  onChange={(event) => setMinutes(event.target.valueAsNumber)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="module-level">Level</Label>
                <Select
                  value={difficulty}
                  onValueChange={(value) =>
                    setDifficulty(value as ManualModuleInput["difficulty"])
                  }
                >
                  <SelectTrigger id="module-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-position">Where does it fit?</Label>
              <Select value={afterStepId} onValueChange={setAfterStepId}>
                <SelectTrigger
                  id="module-position"
                  className="[&>span]:truncate"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-w-[min(32rem,calc(100vw-3rem))]">
                  <SelectItem value="end">At the end of the course</SelectItem>
                  {path.steps.map((step, index) => (
                    <SelectItem key={step.id} value={step.id}>
                      After {index + 1}. {step.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </fieldset>
          <p className="rounded-xl border bg-muted/30 p-3 text-xs leading-6 text-muted-foreground">
            Adding a module uses no AI allowance. Starting its new lesson uses
            your usual generation allowance. Your existing lessons and completed
            modules stay saved.
          </p>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Plus />}
              {saving ? "Adding module…" : "Add module"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
