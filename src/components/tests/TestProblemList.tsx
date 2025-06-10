import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit, Trash2, GripVertical } from 'lucide-react';
import { TestProblem } from '@/types/testTypes';

interface TestProblemListProps {
  problems: TestProblem[];
  onReorder: (reorderedProblems: TestProblem[]) => void;
  onEdit?: (problem: TestProblem) => void;
  onDelete?: (problem: TestProblem) => void;
}

const TestProblemList: React.FC<TestProblemListProps> = ({
  problems,
  onReorder,
  onEdit,
  onDelete
}) => {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  
  const toggleExpand = (id: string) => {
    setExpandedItems({
      ...expandedItems,
      [id]: !expandedItems[id]
    });
  };
  
  const handleDragStart = (e: React.DragEvent, problemId: string) => {
    setDraggedItem(problemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', problemId);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    const draggedIndex = problems.findIndex(p => p.id === draggedItem);
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedItem(null);
      return;
    }
    
    const reorderedProblems = Array.from(problems);
    const [removedItem] = reorderedProblems.splice(draggedIndex, 1);
    reorderedProblems.splice(targetIndex, 0, removedItem);
    
    const updatedProblems = reorderedProblems.map((problem, index) => ({
      ...problem,
      order_index: index
    }));
    
    onReorder(updatedProblems);
    setDraggedItem(null);
  };
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mcq': return 'Multiple Choice';
      case 'theoretical': return 'Theoretical';
      case 'practical': return 'Practical';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };
  
  if (!problems.length) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              No problems have been added to this test series yet.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {problems.map((problem, index) => (
        <div
          key={problem.id}
          draggable
          onDragStart={(e) => handleDragStart(e, problem.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
          className={`bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-200 ${
            draggedItem === problem.id ? 'opacity-50 scale-95' : 'hover:shadow-md'
          }`}
        >
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {index + 1}.
                  </span>
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {problem.problem_statement.length > 100 
                      ? `${problem.problem_statement.substring(0, 100)}...` 
                      : problem.problem_statement}
                  </h3>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    {getTypeLabel(problem.problem_type)}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDifficultyColor(problem.difficulty)}`}>
                    {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                  </span>
                  {problem.topic && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                      {problem.topic}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-1 ml-4">
                <button
                  className="p-1 text-gray-400 hover:text-gray-600 cursor-move"
                  title="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleExpand(problem.id)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  aria-label="expand"
                >
                  {expandedItems[problem.id] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {expandedItems[problem.id] && (
            <>
              <hr className="border-gray-200" />
              <div className="p-4">
                <p className="text-sm text-gray-700 mb-4">
                  {problem.problem_statement}
                </p>
                
                {problem.problem_type === 'mcq' && problem.multiple_choice_options && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Options:</h4>
                    <div className="space-y-1">
                      {problem.multiple_choice_options.map((option, i) => (
                        <div key={i} className="text-sm">
                          <span
                            className={`${
                              option === problem.correct_answer
                                ? 'font-semibold text-green-700'
                                : 'text-gray-700'
                            }`}
                          >
                            {String.fromCharCode(65 + i)}. {option}
                            {option === problem.correct_answer && (
                              <span className="text-green-600 ml-1">(Correct)</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {problem.correct_answer && problem.problem_type !== 'mcq' && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900">Correct Answer:</h4>
                    <p className="text-sm text-gray-700 mt-1">{problem.correct_answer}</p>
                  </div>
                )}
                
                {problem.explanation && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900">Explanation:</h4>
                    <p className="text-sm text-gray-700 mt-1">{problem.explanation}</p>
                  </div>
                )}
                
                {(onEdit || onDelete) && (
                  <div className="flex justify-end space-x-2 pt-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(problem)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(problem)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default TestProblemList;