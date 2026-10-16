"use client";
import { useAppRouter } from "@/hooks/useAppRouter";

import CreatePathDialog from "@/components/learning-paths/CreatePathDialog";
import type {
  CustomLearningGoal,
  LearningPath,
} from "@/types/chat-feature/chat-feature";

// Keep the older tutor entry point on the same real AI creation flow as the library.
export default function CustomLearningPathModal({
  isOpen,
  onClose,
  topic,
  initialGoals,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goals: CustomLearningGoal[]) => void;
  topic?: string;
  initialGoals?: CustomLearningGoal[];
  searchHistory?: string[];
  existingPath?: LearningPath;
}) {
  const router = useAppRouter();
  return isOpen ? (
    <CreatePathDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      initialTopic={topic || initialGoals?.[0]?.title || ""}
      onCreated={(path) => router.push(`/learning-paths?path=${path.id}`)}
    />
  ) : null;
}
