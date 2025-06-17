import { supabase, isSupabaseConfigured } from './supabaseClient';
import { LearningPath, CustomLearningGoal, UserProfile } from '../../types/chat-feature';

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
          title: learningPath.title,
          description: learningPath.description,
          main_topic: learningPath.main_topic,
          current_step: learningPath.current_step,
          total_steps: learningPath.total_steps,
          steps: learningPath.steps,
          estimated_hours: learningPath.estimated_hours,
          completed_topics: learningPath.completed_topics,
          suggested_topics: learningPath.suggested_topics,
          is_custom_path: learningPath.is_custom_path || false,
          goals: learningPath.goals || [],
          timeline: learningPath.timeline,
          created_at: (learningPath.created_at instanceof Date ? learningPath.created_at.toISOString() : learningPath.created_at) || new Date().toISOString(),
          updated_at: (learningPath.updated_at instanceof Date ? learningPath.updated_at.toISOString() : learningPath.updated_at) || new Date().toISOString()
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
      title: mainTopic, 
      description: `A custom learning path focused on ${mainTopic}`,
      main_topic: mainTopic,
      current_step: 1,
      total_steps: goals.length,
      steps: [], 
      estimated_hours: totalEstimatedHours,
      completed_topics: [],
      suggested_topics: this.generateSuggestionsFromGoals(goals),
      is_custom_path: true,
      goals: goals.map(g => g.title),
      timeline: `${Math.ceil(totalEstimatedHours / 10)} weeks`,
      created_at: new Date(),
      updated_at: new Date()
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
      title: data.title,
      description: data.description,
      main_topic: data.main_topic,
      current_step: data.current_step,
      total_steps: data.total_steps,
      steps: data.steps || [],
      estimated_hours: data.estimated_hours,
      completed_topics: data.completed_topics || [],
      suggested_topics: data.suggested_topics || [],
      is_custom_path: data.is_custom_path || false,
      goals: data.goals || [],
      timeline: data.timeline,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}

export const learningPathService = new LearningPathService();