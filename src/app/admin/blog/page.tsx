// src/app/admin/blog/page.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
// Removed: import { generateBlogPost, type GenerateBlogPostInput, type GenerateBlogPostOutput } from '@/ai/flows/generate-blog-post';
import { Loader2, FileText, Link as LinkIcon, Wand2, Info } from 'lucide-react';
// Footer is now global

// Define the output type based on the expected API response
interface BlogPostApiOutput {
  title: string;
  suggestedSlug: string;
  metaDescription: string;
  content: string;
}

export default function AdminBlogPage() {
  const { toast } = useToast();
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [targetAudience, setTargetAudience] = useState('students preparing for competitive exams');
  const [tone, setTone] = useState('informative and encouraging');
  
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<BlogPostApiOutput | null>(null);

  const handleGeneratePost = async () => {
    if (!topic.trim()) {
      toast({
        variant: "destructive",
        title: "Topic Required",
        description: "Please enter a topic for the blog post.",
      });
      return;
    }

    setIsLoading(true);
    setGeneratedPost(null);
    try {
      const input = {
        topic,
        keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
        targetAudience,
        tone,
      };
      
      const response = await fetch('/api/generate-blog-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to generate blog post');
      }

      const result: BlogPostApiOutput = await response.json();
      setGeneratedPost(result);
      toast({
        title: "Blog Post Draft Generated!",
        description: "Review the draft below. You can copy it to your CMS or save it.",
      });
    } catch (error) {
      console.error("Error generating blog post:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate blog post draft. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Admin - Blog Post Generator</h1>
        <p className="text-muted-foreground mb-6">Use AI to draft blog posts. Remember to review and edit before publishing.</p>
        <Card className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-900/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Important Note</p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  This page is for AI draft generation only. Generated content is not automatically saved to a database or published. 
                  Proper admin authentication and blog management features would be required for a production system.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wand2 /> Generate Draft</CardTitle>
              <CardDescription>Provide details for the AI to generate a blog post draft.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="topic">Main Topic (Required)</Label>
                <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Effective Study Techniques" />
              </div>
              <div>
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Input id="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g., learning, productivity, exam tips" />
              </div>
              <div>
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Input id="targetAudience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tone">Tone</Label>
                <Input id="tone" value={tone} onChange={(e) => setTone(e.target.value)} />
              </div>
              <Button onClick={handleGeneratePost} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2" />}
                {isLoading ? 'Generating...' : 'Generate Blog Post Draft'}
              </Button>
            </CardContent>
          </Card>

          {generatedPost && (
            <Card className="shadow-lg md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText /> Generated Draft</CardTitle>
                <CardDescription>Copy the content below. Remember to review and save it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="generatedTitle">Title</Label>
                  <Input id="generatedTitle" value={generatedPost.title} readOnly />
                </div>
                <div>
                  <Label htmlFor="generatedSlug" className="flex items-center gap-1"><LinkIcon size={14}/> Suggested Slug</Label>
                  <Input id="generatedSlug" value={generatedPost.suggestedSlug} readOnly />
                </div>
                <div>
                  <Label htmlFor="generatedMetaDescription">Meta Description (for SEO)</Label>
                  <Textarea id="generatedMetaDescription" value={generatedPost.metaDescription} readOnly rows={3} />
                </div>
                <div>
                  <Label htmlFor="generatedContent">Content (Markdown)</Label>
                  <Textarea id="generatedContent" value={generatedPost.content} readOnly rows={20} className="font-mono text-xs" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
