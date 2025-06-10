import React, { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';


import { TestProblem, ProblemType } from '@/types';

interface TestProblemFormProps {
  problem?: TestProblem;
  onSubmit: (problem: Partial<TestProblem>) => void;
  onCancel: () => void;
}

const TestProblemForm: React.FC<TestProblemFormProps> = ({
  problem,
  onSubmit,
  onCancel
}) => {
  const [problemStatement, setProblemStatement] = useState(problem?.problem_statement || '');
  // Map between frontend and backend problem types
  const problemTypeMap = {
    'mcq': 'multiple_choice',
    'multiple_choice': 'multiple_choice',
    'theory': 'theory',
    'practical': 'practical',
    'conceptual': 'conceptual',
    'numerical': 'numerical',
    'diagram_based': 'diagram_based',
    'essay': 'essay',
    'code': 'code',
    'random': 'theory' // Default to theory for random
  } as const;

  const [problemType, setProblemType] = useState<keyof typeof problemTypeMap>(
    (problem?.problem_type as keyof typeof problemTypeMap) || 'theory'
  );
  const [difficulty, setDifficulty] = useState(problem?.difficulty || 'medium');
  const [topic, setTopic] = useState(problem?.topic || '');
  const [correctAnswer, setCorrectAnswer] = useState(problem?.correct_answer || '');
  const [explanation, setExplanation] = useState(problem?.explanation || '');
  const [options, setOptions] = useState<string[]>(
    (problem?.problem_type === 'mcq' || problem?.problem_type === 'multiple_choice') && problem.multiple_choice_options 
      ? problem.multiple_choice_options 
      : ['', '', '', '']
  );
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!problemStatement.trim()) {
      newErrors.problemStatement = 'Problem statement is required';
    }
    
    if (problemType === 'mcq') {
      if (!options.some(opt => opt.trim())) {
        newErrors.options = 'At least one option is required';
      }
      
      if (!correctAnswer.trim()) {
        newErrors.correctAnswer = 'Correct answer is required for MCQ problems';
      } else {
        // Check if correct answer is among the options
        if (!options.some(opt => opt.trim() === correctAnswer.trim())) {
          newErrors.correctAnswer = 'Correct answer must match one of the options';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (indexToRemove: number) => {
    setOptions(options.filter((_, index) => index !== indexToRemove));
  };

  const handleOptionChange = (indexToChange: number, newValue: string) => {
    setOptions(
      options.map((option, index) => (index === indexToChange ? newValue : option))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Convert frontend problem type to backend problem type
    const backendProblemType = problemTypeMap[problemType as keyof typeof problemTypeMap] as ProblemType;
    
    const problemData: Partial<TestProblem> = {
      problem_statement: problemStatement.trim(),
      problem_type: backendProblemType,
      difficulty,
      topic: topic.trim() || null,
      correct_answer: correctAnswer.trim() || null,
      explanation: explanation.trim() || null,
      multiple_choice_options: (problemType === 'mcq' || problemType === 'multiple_choice') 
        ? options.filter(opt => opt.trim())
        : null
    };
    
    onSubmit(problemData);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="col-span-full">
          <label htmlFor="problemStatement" className="block text-sm font-medium text-gray-700">Problem Statement</label>
          <MDEditor
            value={problemStatement}
            onChange={(val) => setProblemStatement(val || '')}
            height={200}
            preview="live"
            data-color-mode="light"
          />
          {errors.problemStatement && <p className="mt-2 text-sm text-red-600">{errors.problemStatement}</p>}
        </div>
        <div>
          <label htmlFor="problemType" className="block text-sm font-medium text-gray-700">Problem Type</label>
          <select
            id="problemType"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={problemType}
            onChange={(e) => setProblemType(e.target.value as ProblemType)}
          >
            <option value="mcq">Multiple Choice</option>
            <option value="theory">Theory</option>
            <option value="practical">Practical</option>
            <option value="conceptual">Conceptual</option>
            <option value="numerical">Numerical</option>
            {/* <option value="diagram_based">Diagram Based</option> */}
            <option value="essay">Essay</option>
            <option value="code">Code</option>
          </select>
          {errors.problemType && <p className="mt-2 text-sm text-red-600">{errors.problemType}</p>}
        </div>
        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">Difficulty</label>
          <select
            id="difficulty"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          {errors.difficulty && <p className="mt-2 text-sm text-red-600">{errors.difficulty}</p>}
        </div>
        <div className="col-span-full">
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700">Topic</label>
          <input
            type="text"
            id="topic"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          {errors.topic && <p className="mt-2 text-sm text-red-600">{errors.topic}</p>}
        </div>

        {(problemType === 'mcq' || problemType === 'multiple_choice') && (
          <div className="col-span-full">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Multiple Choice Options</h3>
            {options.map((option, index) => (
              <div key={index} className="flex items-center mb-4">
                <input
                  type="text"
                  placeholder={`Option ${index + 1}. Use standard notation for numbers and scientific values. For complex equations, use LaTeX.`}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  disabled={options.length <= 2}
                  className="ml-2 p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddOption}
              disabled={options.length >= 6}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Option
            </button>
            {errors.options && <p className="mt-2 text-sm text-red-600">{errors.options}</p>}
          </div>
        )}

        <div className="col-span-full">
          <label htmlFor="correctAnswer" className="block text-sm font-medium text-gray-700">Correct Answer</label>
          <input
            type="text"
            id="correctAnswer"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            placeholder="Enter the correct answer. For numerical answers, use standard notation. For complex answers, use LaTeX (e.g., $\\frac{1}{2}mv^2$)."
          />
          {errors.correctAnswer && <p className="mt-2 text-sm text-red-600">{errors.correctAnswer}</p>}
        </div>
        <div className="col-span-full">
          <label htmlFor="explanation" className="block text-sm font-medium text-gray-700">Explanation</label>
          <MDEditor
            value={explanation}
            onChange={(val) => setExplanation(val || '')}
            height={200}
            preview="live"
            data-color-mode="light"
          />
          {errors.explanation && <p className="mt-2 text-sm text-red-600">{errors.explanation}</p>}
        </div>
        <div className="col-span-full">
          <hr className="my-4 border-gray-200" />
        </div>
        <div className="col-span-full flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {problem ? 'Update Problem' : 'Add Problem'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default TestProblemForm;
