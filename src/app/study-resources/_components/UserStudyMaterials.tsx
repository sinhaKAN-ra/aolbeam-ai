'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, PlusCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  link_url: string;
  created_at: string;
}

export function UserStudyMaterials() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user-study-materials');
      if (!response.ok) {
        throw new Error('Failed to fetch materials');
      }
      const data = await response.json();
      setMaterials(data);
    } catch (err: any) {
      setError(err.message);
      toast.error('Could not load your study materials.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/user-study-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, link_url: linkUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to add material');
      }

      toast.success('Material added successfully!');
      setTitle('');
      setDescription('');
      setLinkUrl('');
      fetchMaterials(); // Refresh the list
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/user-study-materials/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete material');
      }

      toast.success('Material deleted successfully!');
      setMaterials(materials.filter(m => m.id !== id));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>My Materials</CardTitle>
        <CardDescription>
          Add and manage your personal study links. Only you can see these.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="mb-6 space-y-4">
          <Input
            placeholder="Title"            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            type="url"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            required
          />
          <Button type="submit" disabled={isSubmitting}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Adding...' : 'Add Material'}
          </Button>
        </form>

        {isLoading && <p>Loading your materials...</p>}
        {error && <p className="text-red-500">{error}</p>}
        
        <div className="space-y-4">
          {materials.map(material => (
            <Card key={material.id} className="flex items-center justify-between p-4">
              <div>
                <h3 className="font-semibold">{material.title}</h3>
                <p className="text-sm text-muted-foreground">{material.description}</p>
                <a 
                  href={material.link_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline flex items-center mt-1"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Visit Link
                </a>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(material.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
        {!isLoading && materials.length === 0 && (
          <p className="text-center text-muted-foreground py-4">You haven't added any materials yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
