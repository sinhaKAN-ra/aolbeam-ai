import type {
  CustomLearningGoal,
  LearningPath,
} from "@/types/chat-feature/chat-feature";

import type { ManualModuleInput } from "@/lib/learning-paths/schema";

async function pathRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || "Could not update your learning path. Please try again.",
    );
  return data as T;
}
export class LearningPathService {
  getUserLearningPaths() {
    return pathRequest<LearningPath[]>("/api/learning-paths").then((paths) =>
      paths.map((path) => ({
        ...path,
        steps: Array.isArray(path.steps) ? path.steps : [],
      })),
    );
  }
  createCustomLearningPath(
    goals: CustomLearningGoal[],
    _searchHistory: unknown[] = [],
  ) {
    return pathRequest<LearningPath>("/api/learning-paths/generate", {
      method: "POST",
      body: JSON.stringify({ goals }),
    });
  }
  saveLearningPath(path: LearningPath) {
    return pathRequest<LearningPath>("/api/learning-paths", {
      method: "PUT",
      body: JSON.stringify({ id: path.id, updates: { title: path.title } }),
    });
  }
  addModule(pathId: string, input: ManualModuleInput) {
    return pathRequest<{ path: LearningPath; stepId: string }>(
      `/api/learning-paths/${pathId}/modules`,
      { method: "POST", body: JSON.stringify(input) },
    );
  }
  loadLesson(pathId: string, stepId: string) {
    return pathRequest<LearningPath>(`/api/learning-paths/${pathId}/lesson`, {
      method: "POST",
      body: JSON.stringify({ stepId }),
    });
  }
  updateProgress(
    pathId: string,
    stepId: string,
    completed: boolean,
    answer?: number,
  ) {
    return pathRequest<LearningPath>(`/api/learning-paths/${pathId}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ stepId, completed, answer }),
    });
  }
  deleteLearningPath(pathId: string) {
    return pathRequest<{ success: boolean }>(
      `/api/learning-paths?id=${encodeURIComponent(pathId)}`,
      { method: "DELETE" },
    );
  }
  // Recent tutor topics are only a convenience; never substitute them for course generation.
  async saveSearchHistory(_userId: string, searchTerm: string) {
    try {
      const history: string[] = JSON.parse(
        localStorage.getItem("searchHistory") || "[]",
      );
      localStorage.setItem(
        "searchHistory",
        JSON.stringify(
          [searchTerm, ...history.filter((item) => item !== searchTerm)].slice(
            0,
            50,
          ),
        ),
      );
    } catch {
      /* Optional browser history. */
    }
  }
  async getUserSearchHistory(_userId: string): Promise<string[]> {
    try {
      return JSON.parse(localStorage.getItem("searchHistory") || "[]");
    } catch {
      return [];
    }
  }
}
export const learningPathService = new LearningPathService();
