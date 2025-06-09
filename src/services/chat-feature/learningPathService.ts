import { supabase, isSupabaseConfigured } from './supabaseClient';
import { LearningPath, CustomLearningGoal, UserProfile } from '../types';

export class LearningPathService {
  async saveLearningPath(learningPath: LearningPath, userId?: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      // Store in localStorage for demo
      const paths = this.getStoredPaths();
      paths.push(learningPath);
      localStorage.setItem('learningPaths', JSON.stringify(paths));
      return;
    }

    try {
      const { error } = await supabase!
        .from('learning_paths')
        .insert([{
          id: learningPath.id,
          user_id: userId,
          main_topic: learningPath.mainTopic,
          current_step: learningPath.currentStep,
          total_steps: learningPath.totalSteps,
          completed_topics: learningPath.completedTopics,
          suggested_topics: learningPath.suggestedTopics,
          is_custom_path: learningPath.isCustomPath || false,
          goals: learningPath.goals || [],
          timeline: learningPath.timeline,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving learning path:', error);
      throw error;
    }
  }

  async getUserLearningPaths(userId: string): Promise<LearningPath[]> {
    if (!isSupabaseConfigured()) {
      return this.getStoredPaths();
    }

    try {
      const { data, error } = await supabase!
        .from('learning_paths')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

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
    searchHistory: string[],
    userId?: string
  ): Promise<LearningPath> {
    // Generate custom learning path based on goals and history
    const mainTopic = goals[0]?.title || 'Custom Learning Journey';
    const allTopics = goals.flatMap(goal => goal.topics);
    const totalEstimatedHours = goals.reduce((sum, goal) => sum + goal.estimatedHours, 0);
    
    const customPath: LearningPath = {
      id: Date.now().toString(),
      mainTopic,
      currentStep: 1,
      totalSteps: goals.length,
      completedTopics: [],
      suggestedTopics: this.generateSuggestionsFromGoals(goals),
      isCustomPath: true,
      goals: goals.map(g => g.title),
      timeline: `${Math.ceil(totalEstimatedHours / 10)} weeks`,
      createdAt: new Date()
    };

    await this.saveLearningPath(customPath, userId);
    return customPath;
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

  private mapFromDatabase(data: any): LearningPath {
    return {
      id: data.id,
      mainTopic: data.main_topic,
      currentStep: data.current_step,
      totalSteps: data.total_steps,
      completedTopics: data.completed_topics || [],
      suggestedTopics: data.suggested_topics || [],
      isCustomPath: data.is_custom_path || false,
      goals: data.goals || [],
      timeline: data.timeline,
      createdAt: new Date(data.created_at)
    };
  }
}

export const learningPathService = new LearningPathService();