
"use client";

import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info, Loader2, BookOpen, Brain } from 'lucide-react';
import MathRenderer from './MathRenderer';

interface TopicRevisionProps {
  topic: string | null;
  details: string | null;
  onFetchDetails: (topic: string) => void;
  isLoading: boolean;
}

export function TopicRevision({ topic, details, onFetchDetails, isLoading }: TopicRevisionProps) {
  const explanatoryMessage = "Mastering exams is about quickly recalling relevant patterns and concepts. This section helps you build that skill. Use it to connect the current problem with its underlying principles, strengthening your ability to recognize these patterns and become more efficient – a key trait of top performers.";

  if (!topic) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <BookOpen className="text-primary" /> Topic Revision
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            {explanatoryMessage}
            <br /><br />
            Generate a problem first to revise its topic.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder or additional info if needed when no topic is selected */}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Brain className="text-primary" /> Topic Revision: <span className="font-normal">{topic}</span>
        </CardTitle>
        <CardDescription className="text-sm mt-1">
         {explanatoryMessage}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!details && (
          <Button onClick={() => onFetchDetails(topic)} disabled={isLoading} className="w-full text-base py-3">
            {isLoading ? <Loader2 className="animate-spin" /> : <><Info className="mr-2 h-4 w-4" /> Revise Topic Details</>}
          </Button>
        )}
        {details && (
          <>
            <ScrollArea className="h-60 w-full rounded-md border p-4 bg-muted/30">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MathRenderer content={details} />
              </div>
            </ScrollArea>
            <Button onClick={() => onFetchDetails(topic)} disabled={isLoading} className="w-full mt-4 text-base py-3" variant="outline">
             {isLoading ? <Loader2 className="animate-spin" /> : "Fetch Again"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
