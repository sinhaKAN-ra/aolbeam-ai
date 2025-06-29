import { supabase, isSupabaseConfigured } from './supabaseClient';
import { LearningPath, CustomLearningGoal, UserProfile, LearningStep } from '../../types/chat-feature';

export class LearningPathService {
  async saveLearningPath(learningPath: LearningPath): Promise<LearningPath> {
    try {
      const response = await fetch('/api/learning-paths', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(learningPath),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save learning path');
      }
      return await response.json();
    } catch (error) {
      console.error('Error saving learning path:', error);
      throw error;
    }
  }

  async getUserLearningPaths(): Promise<LearningPath[]> {
    try {
      const response = await fetch('/api/learning-paths');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch learning paths');
      }
      const data = await response.json();
      return data.map(this.mapFromDatabase);
    } catch (error) {
      console.error('Error fetching learning paths:', error);
      return [];
    }
  }

  async saveSearchHistory(userId: string, searchTerm: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      history.unshift(searchTerm);
      localStorage.setItem('searchHistory', JSON.stringify(history.slice(0, 50)));
      return;
    }

    try {
      const { error } = await supabase!
        .from('search_history')
        .insert([{
          user_id: userId,
          search_term: searchTerm,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }

  async getUserSearchHistory(userId: string): Promise<string[]> {
    if (!isSupabaseConfigured()) {
      return JSON.parse(localStorage.getItem('searchHistory') || '[]');
    }

    try {
      const { data, error } = await supabase!
        .from('search_history')
        .select('search_term')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data.map(item => item.search_term);
    } catch (error) {
      console.error('Error fetching search history:', error);
      return [];
    }
  }

  async createCustomLearningPath(
    goals: CustomLearningGoal[],
    searchHistory: any[]
  ): Promise<LearningPath> {
    // Generate custom learning path based on goals and history
    const mainTopic = goals[0]?.title || 'Custom Learning Journey';
    const totalEstimatedHours = goals.reduce((sum, goal) => sum + goal.estimatedHours, 0);
    
    const steps: LearningStep[] = goals.map((goal, index) => ({
      step: index + 1,
      title: goal.title,
      description: goal.description || `A step focused on mastering ${goal.title}`,
      completed: false,
      estimated_hours: goal.estimatedHours,
      resources: [],
      practice_problems: [],
    }));

    const customPath: LearningPath = {
      id: crypto.randomUUID(),
      title: mainTopic, 
      description: `A custom learning path focused on ${mainTopic}`,
      topic: mainTopic,
      current_step: 0,
      total_steps: goals.length,
      steps: steps, 
      estimated_hours: totalEstimatedHours,
      completed_topics: [],
      suggested_topics: this.generateSuggestionsFromGoals(goals),
      is_custom_path: true,
      goals: goals.map(g => g.title),
      timeline: `${Math.ceil(totalEstimatedHours / 10)} weeks`,
    };


    return await this.saveLearningPath(customPath as LearningPath);
  }

  private generateSuggestionsFromGoals(goals: CustomLearningGoal[]) {
    return goals.map((goal, index) => ({
      id: `goal-${index}`,
      title: goal.title,
      description: goal.description,
      difficulty: goal.difficulty,
      estimatedTime: `${goal.estimatedHours} hours`,
      category: 'Custom Goal',
      tags: goal.topics
    }));
  }

  private getStoredPaths(): LearningPath[] {
    try {
      return JSON.parse(localStorage.getItem('learningPaths') || '[]');
    } catch {
      return [];
    }
  }

  async deleteLearningPath(pathId: string): Promise<void> {
    try {
      const response = await fetch(`/api/learning-paths/${pathId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete learning path');
      }
    } catch (error) {
      console.error('Error deleting learning path:', error);
      throw error;
    }
  }

  private mapFromDatabase(data: any): LearningPath {
    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      description: data.description,
      topic: data.topic,
      main_topic: data.main_topic,
      steps: data.steps || [],
      current_step: data.current_step,
      total_steps: data.total_steps,
      estimated_hours: data.estimated_hours,
      completed_topics: data.completed_topics || [],
      suggested_topics: data.suggested_topics || [],
      is_custom_path: data.is_custom_path || false,
      goals: data.goals || [],
      timeline: data.timeline,
      is_public: data.is_public,
      progress: data.progress,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}

export const learningPathService = new LearningPathService();