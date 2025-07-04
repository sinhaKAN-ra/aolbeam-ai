"use client";

import React, { useEffect, useState, useRef } from "react";
import { Plus, Code, TrendingUp, Shuffle, BookOpen, CheckCircle2, Sparkles, XCircle } from "lucide-react";
import Confetti from "react-confetti";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

// Type imports
// Import all types from a single source to avoid type conflicts
import { LearningPath, CustomLearningGoal, PathType, LearningStep, LearningResource } from '@/types/chat-feature/chat-feature';
// Ensure we're not importing any conflicting types from index.ts

// Services
import { learningPathService } from '@/services/chat-feature/learningPathService';

// Components
import CustomLearningPathModal from "@/components/chat-feature/CustomLearningPathModal";
import PathCreationCard from "@/components/learning-paths/PathCreationCard";
import PathTypeSelector from "@/components/learning-paths/PathTypeSelector";
import StepperModal from "@/components/learning-paths/StepperModal";
import PathCard from '@/components/learning-paths/PathCard';
import GoalDefinition from "@/components/learning-paths/GoalDefinition";
import PathReview from "@/components/learning-paths/PathReview";
import PathDetailView from "@/components/learning-paths/PathDetailView";

// Use LearningStep from chat-feature.ts for consistency

export default function LearningPathsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // New path creation state
  const [showPathCreator, setShowPathCreator] = useState(false);
  const [selectedPathType, setSelectedPathType] = useState<PathType | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [creationStep, setCreationStep] = useState(0);
  const [goals, setGoals] = useState<CustomLearningGoal[]>([]);
  const [generatedSteps, setGeneratedSteps] = useState<LearningStep[]>([]);
  const [editingPath, setEditingPath] = useState<LearningPath | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadPaths();
      loadSearchHistory();
    }
  }, [user?.id]);

  const loadPaths = async () => {
    try {
      setIsLoading(true);
      const result = await learningPathService.getUserLearningPaths();
      // Ensure each path has required fields for type compatibility
      const processedPaths = result.map(path => ({
        ...path,
        topic: path.topic || path.main_topic || '',
        main_topic: path.main_topic || path.topic || '',
        description: path.description || '',
        // Ensure steps have the required 'order' property
        steps: path.steps.map((step, index) => ({
          ...step,
          order: step.order !== undefined ? step.order : index,
          description: step.description || '',
          completed: typeof step.completed === 'boolean' ? step.completed : false
        })) as LearningStep[],
        is_custom_path: path.is_custom_path !== undefined ? path.is_custom_path : true
      })) as LearningPath[];
      setPaths(processedPaths);
    } catch (error) {
      console.error("Error loading paths:", error);
      toast({
        title: "Error",
        description: "Failed to load your learning paths",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSearchHistory = async () => {
    try {
      const history = await learningPathService.getUserSearchHistory(user?.id as string);
      setSearchHistory(history);
    } catch (error) {
      console.error("Error loading search history:", error);
      // Fall back to localStorage if database fetch fails
      const localHistory = localStorage.getItem('searchHistory');
      if (localHistory) {
        setSearchHistory(JSON.parse(localHistory));
      }
    }
  };

  // Helper to calculate path progress percentage
  const calculateProgress = (path: LearningPath) => {
    if (!path.steps || path.steps.length === 0) return 0;
    const completedSteps = path.steps.filter(step => step.completed).length;
    return Math.round((completedSteps / path.steps.length) * 100);
  };
  
  // Path creation and editing functions
  const openPathCreator = (type: PathType) => {
    setSelectedPathType(type);
    setGoals([]);
    setGeneratedSteps([]);
    setCreationStep(0);
    setShowPathCreator(true);
  };
  
  const handleAddGoal = (goal: CustomLearningGoal) => {
    setGoals(prev => [...prev, goal]);
  };
  
  const handleRemoveGoal = (goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
  };
  
  const handleEditStep = (stepId: string, updatedStep: Partial<LearningStep>) => {
    setGeneratedSteps(prev => 
      prev.map(step => step.id === stepId ? { ...step, ...updatedStep } : step)
    );
  };
  
  const handleReorderSteps = (reorderedSteps: LearningStep[]) => {
    // Update order property for each step based on its index
    const stepsWithOrder = reorderedSteps.map((step, index) => ({
      ...step,
      order: index + 1
    }));
    setGeneratedSteps(stepsWithOrder);
  };
  
  // Handle toggle step completion
  const handleToggleStep = async (stepId: string) => {
    // Extract path ID from the element ID format: "path-{pathId}-step-{stepId}"
    const parts = stepId.split('-');
    if (parts.length < 4) return;
    
    const pathId = parts[1];
    const actualStepId = parts[3];
    
    // Find path and step
    const pathIndex = paths.findIndex(p => p.id === pathId);
    if (pathIndex === -1) return;

    const path = paths[pathIndex];
    
    // Update completion status
    const updatedPath = {
      ...path,
      steps: [...path.steps],
      updated_at: new Date().toISOString(),
      topic: path.topic || path.main_topic || '',
      main_topic: path.main_topic || path.topic || '',
      description: path.description || '',
      is_custom_path: path.is_custom_path !== undefined ? path.is_custom_path : true,
      current_step: path.current_step || 0,
      total_steps: path.total_steps || path.steps.length || 0
    } as LearningPath;
    
    const stepIndex = updatedPath.steps.findIndex(s => s.id === actualStepId);
    if (stepIndex === -1) return;
    
    updatedPath.steps[stepIndex] = {
      ...updatedPath.steps[stepIndex],
      completed: !updatedPath.steps[stepIndex].completed,
      order: updatedPath.steps[stepIndex].order !== undefined ? updatedPath.steps[stepIndex].order : stepIndex
    };

    // Calculate new progress
    const completedSteps = updatedPath.steps.filter(step => step.completed).length;
    const progress = (completedSteps / updatedPath.steps.length) * 100;

    // Update state with proper type handling
    setPaths(prev => {
      const newPaths = [...prev];
      newPaths[pathIndex] = updatedPath;
      return newPaths;
    });

    try {
      // Save the updated path with type assertion
      const savedPath = await learningPathService.saveLearningPath(updatedPath as any);
      
      // Update the paths state with the saved path
      setPaths(prev => {
        const newPaths = [...prev];
        const savedIndex = newPaths.findIndex(p => p.id === pathId);
        if (savedIndex !== -1) {
          newPaths[savedIndex] = savedPath as LearningPath;
        }
        return newPaths;
      });
      
      // Show confetti if path is completed
      if (updatedPath.steps.every(step => step.completed)) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    } catch (error) {
      console.error("Error toggling step completion:", error);
      toast({
        title: "Error",
        description: "Failed to update step status",
        variant: "destructive",
      });
    }
  };

  const handleDeletePath = async (pathId: string) => {
    if (confirm('Are you sure you want to delete this learning path? This cannot be undone.')) {
      try {
        await learningPathService.deleteLearningPath(pathId);
        // Use type assertion to ensure proper typing
        setPaths((prev: LearningPath[]) => prev.filter(path => path.id !== pathId));
        if (selectedId === pathId) {
          setSelectedId(null);
        }
        toast({
          title: "Path Deleted",
          description: "The learning path has been deleted successfully.",
        });
      } catch (error) {
        console.error("Error deleting path:", error);
        toast({
          title: "Error",
          description: "Failed to delete the learning path",
          variant: "destructive",
        });
      }
    }
  };
  
  // Legacy modal functions
  const handleEdit = (path: LearningPath) => {
    // Ensure path has all required fields before editing
    const editablePath = {
      ...path,
      topic: path.topic || path.main_topic || '',
      description: path.description || '',
    };
    setEditingPath(editablePath);
    setShowCustomModal(true);
  };

  const handleCustomPathSubmit = async (goals: CustomLearningGoal[]) => {
    if (goals.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one goal to your learning path",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const mainGoal = goals[0];
      const newPath: Partial<LearningPath> = {
        user_id: user?.id,
        title: mainGoal.title,
        description: mainGoal.description,
        main_topic: mainGoal.topics[0] || "",
        estimated_hours: mainGoal.estimatedHours,
        path_type: selectedPathType || "skill",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Create path differently depending on whether we're editing or creating
      let createdPath;
      if (editingPath) {
        createdPath = await learningPathService.saveLearningPath({
          ...newPath,
          id: editingPath.id,
          steps: editingPath.steps,
        } as LearningPath);
      } else {
        createdPath = await learningPathService.createCustomLearningPath([goals[0]], searchHistory);
      }

      // Refresh paths
      await loadPaths();
      
      // Reset state and show success message
      setShowCustomModal(false);
      setShowPathCreator(false);
      setEditingPath(null);
      setGoals([]);
      setGeneratedSteps([]);
      
      toast({
        title: "Success",
        description: editingPath ? "Learning path updated successfully" : "Learning path created successfully",
      });
      
      // Select the new path
      if (createdPath) {
        setSelectedId(createdPath.id);
      }
    } catch (error) {
      console.error("Error creating/updating path:", error);
      toast({
        title: "Error",
        description: "Failed to save your learning path",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle path creation completion through new UI
  const handlePathCreationComplete = async () => {
    if (goals.length === 0) {
      toast({ 
        title: "Error", 
        description: "Please add at least one goal", 
        variant: "destructive" 
      });
      return;
    }
    
    try {
      const newLearningGoals = goals.map(goal => ({
        ...goal,
        description: goal.description || '',
        targetDate: goal.targetDate || new Date(),
        estimatedHours: goal.estimatedHours || 10,
        priority: goal.priority || 'medium',
      }));
      
      // Create the path using the service
      const newPath = await learningPathService.createCustomLearningPath(newLearningGoals, searchHistory);
      
      // Add the new path to the local state
      setPaths(prev => [...prev, newPath]);
      
      // Reset and close modal
      setShowPathCreator(false);
      setSelectedPathType(null);
      setGoals([]);
      setGeneratedSteps([]);
      setCreationStep(0);
      
      // Select the newly created path
      setSelectedId(newPath.id);
      
      toast({
        title: "Success",
        description: "Your learning path has been created!"
      });
    } catch (error) {
      console.error("Error creating path:", error);
      toast({ 
        title: "Error", 
        description: "There was a problem creating your learning path",
        variant: "destructive"
      });
    }
  };

  // Modal step navigation
  const handleNextStep = () => {
    setCreationStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setCreationStep(prev => Math.max(0, prev - 1));
  };
  
  // This function is already defined above
  
  if (!user) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Please Sign In</h2>
          <p className="text-muted-foreground mb-6">You need to sign in to view your learning paths.</p>
          <Link 
            href="/auth/signin" 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const selectedPath = paths.find(p => p.id === selectedId);
  
  return (
    <main className="container mx-auto p-6 min-h-screen">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      
      {/* Hero Section with Path Type Selector */}
      <section className="mb-12">
        <h1 className="text-3xl font-bold mb-6 text-center">Your Learning Journey</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <PathCreationCard
            icon={<Code className="w-6 h-6" />}
            title="Learn a Skill"
            description="Master a specific skill or technology"
            onClick={() => openPathCreator('skill')}
          />
          
          <PathCreationCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Advance Your Career"
            description="Level up in your current career path"
            onClick={() => openPathCreator('advancement')}
          />
          
          <PathCreationCard
            icon={<Shuffle className="w-6 h-6" />}
            title="Change Careers"
            description="Transition to a new career field"
            onClick={() => openPathCreator('career-change')}
          />
        </div>
      </section>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center my-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your learning paths...</p>
          </div>
        </div>
      ) : paths.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No learning paths yet</h2>
          <p className="text-muted-foreground mb-6">Create your first learning path to begin your journey</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left panel: Path cards */}
          <div>
            <div className="sticky top-20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Your Paths</h2>
              </div>

              <div className="space-y-3">
                {paths.map(path => (
                  <PathCard
                    key={path.id}
                    path={path}
                    isSelected={selectedId === path.id}
                    onClick={() => setSelectedId(path.id)}
                    progress={calculateProgress(path)}
                    onDelete={() => handleDeletePath(path.id)}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* Right panel: Selected path details */}
          <div className="lg:col-span-2 bg-background rounded-xl border border-border p-6">
            {selectedPath ? (
              <PathDetailView 
                path={selectedPath} 
                onEdit={() => handleEdit(selectedPath)} 
                onUpdateProgress={handleToggleStep}
              />
            ) : (
              <div className="text-center py-20">
                <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Select a learning path</h2>
                <p className="text-muted-foreground">Choose a learning path from the list to view its details</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Multi-step modal for path creation */}
      {showPathCreator && (
        <StepperModal
          isOpen={showPathCreator}
          onClose={() => setShowPathCreator(false)}
          onComplete={handlePathCreationComplete}
          steps={[
            {
              title: "Select Path Type",
              component: (
                <PathTypeSelector
                  selectedType={selectedPathType}
                  onChange={setSelectedPathType}
                />
              )
            },
            {
              title: "Define Goals",
              component: (
                <GoalDefinition
                  goals={goals}
                  onAddGoal={handleAddGoal}
                  onRemoveGoal={handleRemoveGoal}
                  pathType={selectedPathType}
                />
              )
            },
            {
              title: "Review Path",
              component: (
                <PathReview
                  goals={goals}
                  generatedSteps={generatedSteps}
                  onEditStep={handleEditStep}
                  onReorderSteps={handleReorderSteps}
                />
              )
            }
          ]}
        />
      )}
      {/* Legacy modal content removed - now handled by StepperModal */}
    </main>
  );
}