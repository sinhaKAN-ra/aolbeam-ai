import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile } from '../../types/chat-feature';
import { CustomLearningGoal } from '@/types/chat-feature/chat-feature';
import { LearningStep } from '@/types/chat-feature/chat-feature';
import { LearningPath } from '@/types/chat-feature/chat-feature';

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
    // Always check localStorage first
    const localHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    
    // If Supabase is not configured, just return localStorage data
    if (!isSupabaseConfigured()) {
      return localHistory;
    }

    try {
      // Try to fetch from Supabase
      const { data, error } = await supabase!
        .from('search_history')
        .select('search_term')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      // If there's an error (including missing table), fall back to localStorage
      if (error) {
        console.warn('Falling back to localStorage for search history:', error.message);
        return localHistory;
      }

      return data.map(item => item.search_term);
    } catch (error) {
      console.error('Error fetching search history:', error);
      // Fall back to localStorage on error
      return localHistory;
    }
  }

  async createCustomLearningPath(
    goals: CustomLearningGoal[],
    searchHistory: any[]
  ): Promise<LearningPath> {
    try {
      const mainGoal = goals[0];
      
      // Create a basic learning path structure
      const newPath: Partial<LearningPath> = {
        id: `path_${Date.now()}`,
        title: mainGoal.title,
        description: mainGoal.description || `Custom learning path for ${mainGoal.title}`,
        main_topic: mainGoal.title,
        is_custom_path: true,
        estimated_hours: mainGoal.estimatedHours || 10,
        steps: [],
        current_step: 0,
        total_steps: 0,
        goals: goals.map(g => g.title),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Generate steps from goals and topics
      const steps: LearningStep[] = [];
      
      goals.forEach((goal, goalIndex) => {
        // Create a main step for the goal itself
        steps.push({
          id: `step_${Date.now()}_${goalIndex}`,
          title: goal.title,
          description: goal.description || `Learn about ${goal.title}`,
          completed: false,
          estimatedTime: `${goal.estimatedHours || 5} hours`,
          category: goal.difficulty || 'beginner',
          resources: []
        });
        
        // Create steps for each topic
        if (goal.topics && goal.topics.length > 0) {
          goal.topics.forEach((topic, topicIndex) => {
            if (topic.toLowerCase() !== goal.title.toLowerCase()) {
              steps.push({
                id: `step_${Date.now()}_${goalIndex}_${topicIndex}`,
                title: topic,
                description: `Explore ${topic} as part of ${goal.title}`,
                completed: false,
                estimatedTime: `${Math.round((goal.estimatedHours || 5) / goal.topics.length)} hours`,
                category: goal.difficulty || 'beginner',
                resources: []
              });
            }
          });
        }
      });
      
      newPath.steps = steps;
      newPath.total_steps = steps.length;
      
      // Save the path to the database
      const response = await fetch('/api/learning-paths', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPath),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save learning path');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating custom learning path:', error);
      throw error;
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

  private mapFromDatabase(data: any): Partial<LearningPath> {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      main_topic: data.main_topic || data.topic,
      steps: data.steps || [],
      current_step: data.current_step,
      total_steps: data.total_steps,
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