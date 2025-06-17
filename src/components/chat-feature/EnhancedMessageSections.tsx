import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import {
  BookOpen,
  Video,
  FileText,
  Globe,
  GitBranch,
  Link2,
  ChevronRight,
  Sparkles,
  Tag,
  Lightbulb,
  LinkIcon,
  ExternalLinkIcon
} from 'lucide-react';
import StreamingText from './StreamingText';
import {
  BranchingPath,
  EnhancedMessage,
  ResourceLink,
  TopicSuggestion,
  TopicTag
} from '../../types/chat-feature/enhanced-message';

/* -------------------------------------------------------------------------- */
/*                                Main Content                                */
/* -------------------------------------------------------------------------- */

interface MainContentProps {
  text: string;
  isStreaming?: boolean;
}
export const MainContentSection: React.FC<MainContentProps> = ({ text, isStreaming }) => (
  <div className="text-gray-800 leading-relaxed">
    <StreamingText text={text} isComplete={!isStreaming} />
  </div>
);

/* -------------------------------------------------------------------------- */
/*                             Detailed Explanation                            */
/* -------------------------------------------------------------------------- */

interface DetailedProps {
  detailed: string;
}
export const DetailedContentSection: React.FC<DetailedProps> = ({ detailed }) => {
  const [show, setShow] = useState(false);
  if (!detailed) return null;
  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
      <button
        onClick={() => setShow(prev => !prev)}
        className="text-sm font-semibold text-purple-600 mb-2"
      >
        {show ? 'Hide detailed explanation' : 'Show detailed explanation'}
      </button>
      {show && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{detailed}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                            Topic Suggestions Tags                           */
/* -------------------------------------------------------------------------- */
interface SuggestionsProps {
  suggestions?: TopicSuggestion[];
  onTagSelect: (suggestion: TopicSuggestion) => void;
}
export const SuggestionsSection: React.FC<SuggestionsProps> = ({ suggestions = [], onTagSelect }) => {
  if (!suggestions.length) return null;
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Tag className="w-4 h-4 text-indigo-500" />
        Suggestions
      </h4>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s, index) => (
          <button
            key={s.id || `suggestion-${index}`}
            onClick={() => onTagSelect(s)}
            className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs hover:bg-indigo-100"
          >
            {s.title}
          </button>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                               Branching Paths                               */
/* -------------------------------------------------------------------------- */
interface BranchingProps {
  paths?: BranchingPath[];
  onSelect: (path: BranchingPath) => void;
}
export const BranchingPathsSection: React.FC<BranchingProps> = ({ paths = [], onSelect }) => {
  if (!paths.length) return null;
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-emerald-500" />
        Branching Paths
      </h4>
      <div className="grid gap-2">
        {paths.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="group flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-emerald-300 hover:shadow-md transition-all duration-200 text-left"
          >
            <div>
              <div className="font-medium text-gray-900">{p.title}</div>
              {p.description && <div className="text-sm text-gray-600">{p.description}</div>}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  Resources                                  */
/* -------------------------------------------------------------------------- */
interface ResourcesProps {
  resources?: ResourceLink[];
}
export const ResourcesSection: React.FC<ResourcesProps> = ({ resources = [] }) => {
  const [filter, setFilter] = useState<string | null>(null);
  if (!resources.length) return null;

  const byType = filter ? resources.filter(r => r.type === filter) : resources;
  const uniqueTypes = Array.from(new Set(resources.map(r => r.type)));

  const icon = (type: ResourceLink['type']) => {
    const map: Record<string, JSX.Element> = {
      article: <BookOpen className="w-4 h-4" />,
      video: <Video className="w-4 h-4" />,
      document: <FileText className="w-4 h-4" />,
      web_page: <LinkIcon className="w-4 h-4" />,
      brave_search: <Globe className="w-4 h-4" />,
      documentation: <FileText className="w-4 h-4" />,
      tutorial: <Video className="w-4 h-4" />,
      default: <LinkIcon className="w-4 h-4" />
    };
    return map[type] || map.default;
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-green-500" />
        Additional Resources
      </h4>
      {uniqueTypes.length > 1 && (
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setFilter(null)}
            className={`text-xs px-2 py-1 rounded ${!filter ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            All
          </button>
          {uniqueTypes.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-xs px-2 py-1 rounded ${filter === t ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-2">
        {byType.map((r, idx) => (
          <a
            key={idx}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all duration-200"
          >
            <div className="text-green-600">{icon(r.type)}</div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 group-hover:text-green-700">{r.title}</div>
            </div>
            <ExternalLinkIcon className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
          </a>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              Practice Problem                              */
/* -------------------------------------------------------------------------- */
interface PracticeProblemSectionProps {
  practiceProblems?: { question: string; }[];
  topicFallback: string;
}

export const PracticeProblemSection: React.FC<PracticeProblemSectionProps> = ({ practiceProblems, topicFallback }) => {
  if (!practiceProblems || practiceProblems.length === 0) {
    return (
      <div className="text-center py-4 px-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-400">No practice problems available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-yellow-500" />
        Practice Problems
      </h4>
      <div className="grid gap-2">
        {practiceProblems.map((problem, index) => {
          if (!problem) return null;
          const problemText = typeof problem.question === 'string' ? problem.question : JSON.stringify(problem.question);
          const problemNumber = index + 1;
          
          return (
            <div
              key={index}
              onClick={() => {
                console.log('Problem selected:', problemText);
                // You can add state management here to track selected problem
              }}
              className="group flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-yellow-300 hover:shadow-md transition-all duration-200 text-left cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 mt-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                  {problemNumber}
                </div>
                <div className="text-sm text-gray-800 leading-relaxed">
                  {problemText}
                </div>
              </div>
              <div className="text-gray-400 group-hover:text-yellow-500 transition-colors">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          );
        })}
         <div className="text-xs text-gray-400 mt-2 text-center">
        Select a problem to get start practicing
      </div>
      </div>
     
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                           Aggregate Type Helper                            */
/* -------------------------------------------------------------------------- */
export interface SectionPropsBase {
  message: EnhancedMessage;
  onBranchSelect: (p: BranchingPath) => void;
  onTagSelect: (s: TopicSuggestion) => void;
}

export const useSectionsFromMessage = (
  message: EnhancedMessage,
  onBranchSelect: (p: BranchingPath) => void,
  onTagSelect: (s: TopicSuggestion) => void
) => {
  const ec = message.enhancedContent;
  return {
    main: {
      text: ec?.mainContent || message.text,
      isStreaming: message.isStreaming
    },
    detailed: ec?.detailedContent || '',
    suggestions: ec?.suggestions || [],
    branchingPaths: ec?.branchingPaths || [],
    resources: ec?.resources || [],
    practiceProblems: ec?.practiceProblems,
    topicFallback:
      message.tags?.[0]?.name || ec?.suggestions?.[0]?.title || message.text.split(' ').slice(0, 3).join(' ')
  };
};
