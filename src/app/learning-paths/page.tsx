"use client";

import React, { useEffect, useState } from "react";
import { Plus, XCircle, Clock, BookOpen, Sparkles, Brain, CheckCircle2, ArrowRight, Zap, MessageSquare } from "lucide-react";
import Confetti from "react-confetti";
import { formatDistanceToNow } from "date-fns";
import { CustomLearningGoal, TopicSuggestion, LearningPath as ModalLearningPath } from "@/types/chat-feature/chat-feature";
import { LearningPath } from "@/types/chat-feature";
import { learningPathService } from '@/services/chat-feature/learningPathService';

// Type adapter to convert between different LearningPath definitions
function adaptLearningPath(path: LearningPath): ModalLearningPath {
  return {
    ...path,
    topic: path.main_topic || '',
    description: path.description || '',
    steps: path.steps.map((step, index) => ({
      ...step,
      order: index + 1,
    })),
  } as ModalLearningPath;
}

// Type adapter for CustomLearningGoal
function adaptCustomLearningGoal(goal: CustomLearningGoal): any {
  return {
    ...goal,
    description: goal.description || '',
    targetDate: goal.targetDate || new Date(),
    estimatedHours: goal.estimatedHours || 10,
    priority: goal.priority || 'medium',
  };
}

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import CustomLearningPathModal from "@/components/chat-feature/CustomLearningPathModal";

// Helper function to generate study cards from steps
function generateStudyCards(steps: any[]): { id: string; front: string; back: string; reviewed: boolean }[] {
  return steps
    .filter(step => step.description && step.description.trim() !== '')
    .map(step => ({
      id: step.id,
      front: step.title,
      back: step.description || '',
      reviewed: false
    }));
}

export default function LearningPathsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [editingPath, setEditingPath] = useState<LearningPath | null>(null);

  useEffect(() => {
    async function loadPaths() {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const userPaths = await learningPathService.getUserLearningPaths();
        setPaths(userPaths);
        
        // Load search history for suggestions
        const history = await learningPathService.getUserSearchHistory(user.id);
        setSearchHistory(history || []);
        
        if (userPaths.length > 0 && !selectedId) {
          setSelectedId(userPaths[0].id);
        }
      } catch (err) {
        console.error("Failed to load paths:", err);
        toast({
          title: "Error",
          description: "Failed to load your learning paths",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadPaths();
  }, [user?.id, toast, selectedId]);

  const handleCreate = () => {
    setEditingPath(null);
    setShowCustomModal(true);
  };

  const handleEdit = (path: LearningPath) => {
    setEditingPath(path);
    setShowCustomModal(true);
  };
  
  const handleCustomPathSubmit = async (goals: CustomLearningGoal[]) => {
    if (!user?.id || goals.length === 0) return;

    setIsLoading(true);
    let updatedPath: LearningPath;

    try {
      // If we're editing an existing path, update it
      if (editingPath) {
        // Update the existing path with new goal data
        const updatedPathData = {
          ...editingPath,
          title: goals[0]?.title || editingPath.title,
          description: goals[0]?.description || editingPath.description,
          main_topic: goals[0]?.title || editingPath.main_topic,
          updated_at: new Date().toISOString()
        };
        
        const newPath = await learningPathService.saveLearningPath(updatedPathData);

        // Convert the returned path to the expected LearningPath type
        updatedPath = {
          ...newPath,
          title: goals[0]?.title || 'Custom Learning Path',
          description: goals[0]?.description || 'A custom learning journey',
          steps: newPath.steps?.map(step => ({
            ...step,
            // Ensure any required properties from index.ts LearningStep are present
            description: step.description || ''
          })) || [],
          total_steps: newPath.steps?.length || 0,
          current_step: 0,
          main_topic: goals[0]?.title || 'Custom Learning Path',
          updated_at: new Date().toISOString()
        } as LearningPath;

        // Update the paths array with the new path
        setPaths(prevPaths => {
          const filteredPaths = prevPaths.filter(p => p.id !== updatedPath.id);
          return [updatedPath, ...filteredPaths];
        });
        
        setSelectedId(newPath.id);
        
        toast({
          title: "Success",
          description: "Custom learning path updated",
        });
      } else {
        // Create a new path
        const newPath = await learningPathService.createCustomLearningPath(
          [adaptCustomLearningGoal(goals[0])],
          searchHistory || []
        );

        // Convert the returned path to the expected LearningPath type
        updatedPath = {
          ...newPath,
          title: goals[0]?.title || 'Custom Learning Path',
          description: goals[0]?.description || 'A custom learning journey',
          steps: newPath.steps?.map(step => ({
            ...step,
            // Ensure any required properties from index.ts LearningStep are present
            description: step.description || ''
          })) || [],
          total_steps: newPath.steps?.length || 0,
          current_step: 0,
          main_topic: goals[0]?.title || 'Custom Learning Path',
          updated_at: new Date().toISOString()
        } as LearningPath;

        // Add the new path to the paths array
        setPaths(prevPaths => [updatedPath, ...prevPaths]);
        setSelectedId(newPath.id);
        
        toast({
          title: "Success",
          description: "Custom learning path created",
        });
      }

      setShowCustomModal(false);
      setEditingPath(null);
    } catch (error) {
      console.error("Error creating custom learning path:", error);
      toast({
        title: "Error",
        description: "Failed to create custom learning path",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePath = async (pathId: string) => {
    try {
      await learningPathService.deleteLearningPath(pathId);
      setPaths(prevPaths => prevPaths.filter(path => path.id !== pathId));
      
      if (selectedId === pathId) {
        const remainingPaths = paths.filter(path => path.id !== pathId);
        setSelectedId(remainingPaths.length > 0 ? remainingPaths[0].id : null);
      }
      
      toast({
        title: "Success",
        description: "Learning path deleted",
      });
    } catch (err) {
      console.error("Failed to delete path:", err);
      toast({
        title: "Error",
        description: "Failed to delete learning path",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your learning paths.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your learning paths...</p>
        </div>
      </div>
    );
  }

  const selectedPath = paths.find((p) => p.id === selectedId) || null;

  return (
    <div className="container mx-auto py-8 px-4 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* LEFT COLUMN: Path List */}
        <div className="md:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Learning Paths</h1>
            <button 
              onClick={handleCreate}
              className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-8 h-8 justify-center"
            >
              <Plus size={16} />
              <span className="sr-only">Create new path</span>
            </button>
          </div>
          
          <PathList
            paths={paths}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
            onDelete={handleDeletePath}
          />
        </div>
        
        {/* RIGHT COLUMN: Selected Path Detail */}
        <div className="md:col-span-2">
          {selectedPath ? (
            <PathDetail 
              path={selectedPath} 
              onEdit={() => handleEdit(selectedPath)}
              onUpdatePath={(updatedPath) => {
                setPaths(prevPaths => 
                  prevPaths.map(path => 
                    path.id === updatedPath.id ? updatedPath : path
                  )
                );
              }}
            />
          ) : (
            <div className="bg-muted/20 border border-border rounded-xl p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium mb-2">No Path Selected</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Select a learning path from the list or create a new one to get started on your learning journey.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Custom Learning Path Modal */}
      {showCustomModal && (
        <CustomLearningPathModal
          isOpen={showCustomModal}
          onClose={() => {
            setShowCustomModal(false);
            setEditingPath(null);
          }}
          onSubmit={handleCustomPathSubmit}
          searchHistory={searchHistory}
          topic={editingPath?.main_topic || ''}
          existingPath={editingPath ? adaptLearningPath(editingPath) : undefined}
          initialGoals={editingPath ? [{
            id: editingPath.id,
            title: editingPath.title,
            description: editingPath.description || '',
            topics: editingPath.main_topic ? [editingPath.main_topic] : [],
            estimatedHours: editingPath.estimated_hours || 10,
            difficulty: 'beginner',
            priority: 'medium'
          }] : []}
        />
      )}
    </div>
  );
}

/* PathList Component */
interface PathListProps {
  paths: LearningPath[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function PathList({ paths, selectedId, onSelect, onDelete }: PathListProps) {
  if (paths.length === 0) {
    return (
      <div className="bg-muted/20 border border-border rounded-xl p-6 text-center">
        <p className="text-muted-foreground">You haven't created any learning paths yet.</p>
        <p className="text-xs text-muted-foreground mt-2">
          Create your first path to start learning!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {paths.map((path) => (
        <div
          key={path.id}
          className={`w-full text-left p-4 rounded-xl border transition-all relative group ${
            path.id === selectedId
              ? "bg-primary/5 border-primary"
              : "hover:bg-accent/10 border-border"
          }`}
        >
          <button
            onClick={() => onSelect(path.id)}
            className="w-full text-left"
          >
            <h3 className="font-medium truncate">{path.title}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {path.current_step}/{path.total_steps} steps • Updated {formatDistanceToNow(new Date(path.updated_at || new Date()), { addSuffix: true })}
            </p>
            <div className="mt-2 flex items-center gap-1">
              <div className="bg-muted/30 h-1.5 flex-1 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.round((path.current_step / path.total_steps) * 100) || 0}%` }}
                  className="h-full bg-primary"
                />
              </div>
              <span className="text-xs font-medium">
                {Math.round((path.current_step / path.total_steps) * 100) || 0}%
              </span>
            </div>
          </button>
          
          <button
            onClick={() => onDelete(path.id)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
          >
            <XCircle size={16} className="text-destructive" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* Path Detail Component */
interface PathDetailProps {
  path: LearningPath;
  onEdit: () => void;
  onUpdatePath: (path: LearningPath) => void;
}

function PathDetail({ path, onEdit, onUpdatePath }: PathDetailProps) {
  const { toast } = useToast();
  const completedSteps = path.steps?.filter(s => s.completed).length || 0;
  const progress = Math.round((completedSteps / (path.total_steps || 1)) * 100) || 0;
  const [showConfetti, setShowConfetti] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (progress === 100 && completedSteps > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [progress, completedSteps]);

  useEffect(() => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const handleToggleStep = async (stepId: string) => {
    const stepIndex = path.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;

    const updatedSteps = [...path.steps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      completed: !updatedSteps[stepIndex].completed
    };

    const updatedPath: LearningPath = {
      ...path,
      steps: updatedSteps,
      current_step: updatedSteps.filter(s => s.completed).length,
      completed_topics: updatedSteps
        .filter(s => s.completed)
        .map(s => s.title),
      updated_at: new Date().toISOString()
    };

    try {
      await learningPathService.saveLearningPath(updatedPath);
      onUpdatePath(updatedPath);
      toast({
        title: "Success",
        description: `Step ${updatedSteps[stepIndex].completed ? 'completed' : 'uncompleted'}`
      });
    } catch (err) {
      console.error("Failed to update step:", err);
      toast({
        title: "Error",
        description: "Failed to update step status",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {showConfetti && <Confetti width={dimensions.width} height={dimensions.height} recycle={false} numberOfPieces={500} />}
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold mb-1">{path.title}</h1>
          <p className="text-muted-foreground max-w-prose">{path.description}</p>
        </div>
        <button
          onClick={onEdit}
          className="text-sm bg-muted px-3 py-1.5 rounded-md hover:bg-muted/80"
        >
          Edit
        </button>
      </header>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{completedSteps}/{path.total_steps} steps ({progress}%)</span>
        </div>
        <div className="w-full bg-muted/30 h-2 rounded-full overflow-hidden">
          <div
            style={{ width: `${progress}%` }}
            className="h-full bg-primary transition-all duration-300"
          />
        </div>
      </div>

      {/* Steps list */}
      {path.steps && path.steps.length > 0 ? (
        <ol className="space-y-4">
          {path.steps.map((step, index) => (
            <li
              key={step.id}
              className={`p-4 rounded-xl border flex justify-between items-center transition-colors ${
                step.completed ? "bg-green-50 border-green-300" : "border-border hover:bg-accent/10"
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleStep(step.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      step.completed 
                        ? "bg-green-500 border-green-500 text-white" 
                        : "border-muted-foreground hover:border-primary"
                    }`}
                  >
                    {step.completed && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  <div>
                    <h4 className={`font-medium ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {step.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {step.estimatedTime} • {step.category || 'General'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/tests/new?topic=${encodeURIComponent(step.title)}`}
                  className="text-sm bg-secondary text-secondary-foreground px-3 py-1 rounded-md hover:bg-secondary/90"
                >
                  Practice
                </Link>
                <Link
                  href={`/chat/new?topic=${encodeURIComponent(step.title)}`}
                  className="text-sm bg-primary text-primary-foreground px-3 py-1 rounded-md hover:bg-primary/90 flex items-center gap-1"
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </Link>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="text-center py-8">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No steps available for this learning path.</p>
        </div>
      )}

      {/* Study cards - Generated from step descriptions */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-3">Study Cards</h3>
        <StudyCardCarousel 
          cards={generateStudyCards(path.steps || [])} 
        />
      </div>
    </div>
  );
}

/* Study Card Carousel Component */
interface StudyCard {
  id: string;
  front: string;
  back: string;
  reviewed: boolean;
}

interface StudyCardCarouselProps {
  cards: StudyCard[];
}

function StudyCardCarousel({ cards }: StudyCardCarouselProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!cards.length) {
    return (
      <div className="bg-muted/20 border border-border rounded-xl p-8 text-center">
        <p className="text-muted-foreground">No study cards available for this path yet.</p>
        <p className="text-xs text-muted-foreground mt-2">
          Complete some steps to generate study cards from their descriptions.
        </p>
      </div>
    );
  }

  const card = cards[index];

  const nextCard = () => {
    setIndex((i) => (i + 1) % cards.length);
    setFlipped(false);
  };

  const prevCard = () => {
    setIndex((i) => (i - 1 + cards.length) % cards.length);
    setFlipped(false);
  };

  return (
    <div className="bg-muted/20 border border-border rounded-xl p-8">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">Card {index + 1} of {cards.length}</p>
        <button
          onClick={() => setFlipped(!flipped)}
          className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-md hover:bg-primary/20"
        >
          {flipped ? 'Show Question' : 'Show Answer'}
        </button>
      </div>
      
      <div className="min-h-[120px] flex items-center justify-center mb-6">
        <div className="text-center">
          <h4 className="font-semibold text-lg mb-2">
            {flipped ? 'Answer' : 'Question'}
          </h4>
          <p className="whitespace-pre-wrap text-muted-foreground max-w-2xl">
            {flipped ? card.back : card.front}
          </p>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <button
          onClick={prevCard}
          className="text-sm px-4 py-2 bg-muted rounded-md hover:bg-muted/80"
        >
          Previous
        </button>
        <div className="flex gap-1">
          {cards.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === index ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <button
          onClick={nextCard}
          className="text-sm px-4 py-2 bg-muted rounded-md hover:bg-muted/80"
        >
          Next
        </button>
      </div>
    </div>
  );
}