"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Database } from '@/types/supabase';

import type { User } from '@supabase/supabase-js';

// Extend Window interface to include Instagram embed
declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

interface Resource {
  title: string;
  type: 'link' | 'video';
  url: string;
  category: 'Study Resources' | 'Tools' | 'Exam Motivation';
  provider?: 'youtube' | 'instagram';
}

interface SupabaseResource extends Resource {
  id: number;
  user_id: string | null;
}

const StudyResourcesPage = () => {
  const [resources, setResources] = useState<SupabaseResource[]>([]);
  const [newResource, setNewResource] = useState<Resource>({ 
    title: '', 
    type: 'link', 
    url: '', 
    category: 'Study Resources', 
    provider: undefined 
  });
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();
  

    const fetchResources = useCallback(async () => {
    if (!currentUser) {
      setResources([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching resources:', error);
        setMessage('Error fetching resources: ' + error.message);
      } else {
        setResources(data as SupabaseResource[] || []);
      }
    } catch (error) {
      console.error('Error in fetchResources:', error);
      setMessage('An unexpected error occurred while fetching resources.');
    } finally {
      setLoading(false);
    }
  }, [supabase, currentUser]);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Error fetching user:', userError);
          setCurrentUser(null);
        } else {
          setCurrentUser(authUser);
        }
      } catch (error) {
        console.error('Error in fetchUser:', error);
        setCurrentUser(null);
      }
    };
    fetchUser();
  }, [supabase]);

  // Fetch resources when user changes or on initial load
  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Load Instagram embed script when needed
  useEffect(() => {
    if (resources.some(r => r.provider === 'instagram')) {
      const existingScript = document.querySelector('script[src="//www.instagram.com/embed.js"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = '//www.instagram.com/embed.js';
        script.async = true;
        script.onload = () => {
          // Process Instagram embeds after script loads
          if (window.instgrm) {
            window.instgrm.Embeds.process();
          }
        };
        document.body.appendChild(script);
      } else {
        // If script already exists, just process the embeds
        if (window.instgrm) {
          window.instgrm.Embeds.process();
        }
      }
    }
  }, [resources]);

  

    const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setMessage('You must be logged in to add a resource.');
      return;
    }

    // Validate required fields
    if (!newResource.title.trim() || !newResource.url.trim()) {
      setMessage('Title and URL are required.');
      return;
    }

    try {
      const resourceToInsert = {
        ...newResource,
        provider: newResource.provider || null, // Convert empty string to null
        user_id: currentUser.id // Associate with the current user
      };

      const { error } = await supabase.from('resources').insert([resourceToInsert]);
      
      if (error) {
        setMessage('Error adding resource: ' + error.message);
      } else {
        setMessage('Resource added successfully!');
        setNewResource({ 
          title: '', 
          type: 'link', 
          url: '', 
          category: 'Study Resources', 
          provider: undefined 
        });
        
        // Refresh resources list
        const { data } = await supabase.from('resources').select('*');
        setResources(data as SupabaseResource[] || []);
      }
    } catch (error) {
      console.error('Error in handleAddResource:', error);
      setMessage('An unexpected error occurred.');
    }
  };

  const handleDeleteResource = async (id: number) => {
    if (!currentUser) {
      setMessage('You must be logged in to delete resources.');
      return;
    }

        // Since we only fetch the user's own resources, this check is a safeguard.
    const resourceToDelete = resources.find(r => r.id === id);
    if (!resourceToDelete || resourceToDelete.user_id !== currentUser.id) {
        setMessage('You do not have permission to delete this resource.');
        return;
    }

    if (!confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    try {
      const { error } = await supabase.from('resources').delete().eq('id', id);
      if (error) {
        setMessage('Error deleting resource: ' + error.message);
      } else {
        setMessage('Resource deleted successfully!');
        setResources(resources.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Error in handleDeleteResource:', error);
      setMessage('Error deleting resource.');
    }
  };

  const getVideoEmbedUrl = (url: string, provider?: string): { embedUrl: string; isSupported: boolean; detectedProvider: string } => {
    // YouTube detection and conversion
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (youtubeMatch || provider === 'youtube') {
      const videoId = youtubeMatch ? youtubeMatch[1] : url.split('/').pop();
      return {
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        isSupported: true,
        detectedProvider: 'youtube'
      };
    }

    // Vimeo detection and conversion
    const vimeoMatch = url.match(/(?:vimeo\.com\/)([0-9]+)/);
    if (vimeoMatch || provider === 'vimeo') {
      const videoId = vimeoMatch ? vimeoMatch[1] : url.split('/').pop();
      return {
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
        isSupported: true,
        detectedProvider: 'vimeo'
      };
    }

    // Dailymotion detection and conversion
    const dailymotionMatch = url.match(/(?:dailymotion\.com\/video\/)([^_]+)/);
    if (dailymotionMatch || provider === 'dailymotion') {
      const videoId = dailymotionMatch ? dailymotionMatch[1] : url.split('/').pop();
      return {
        embedUrl: `https://www.dailymotion.com/embed/video/${videoId}`,
        isSupported: true,
        detectedProvider: 'dailymotion'
      };
    }

    // Twitch detection and conversion
    const twitchMatch = url.match(/(?:twitch\.tv\/videos\/)([0-9]+)/);
    if (twitchMatch || provider === 'twitch') {
      const videoId = twitchMatch ? twitchMatch[1] : url.split('/').pop();
      return {
        embedUrl: `https://player.twitch.tv/?video=${videoId}&parent=${window.location.hostname}`,
        isSupported: true,
        detectedProvider: 'twitch'
      };
    }

    // Wistia detection and conversion
    const wistiaMatch = url.match(/(?:wistia\.com\/medias\/)([^?]+)/);
    if (wistiaMatch || provider === 'wistia') {
      const videoId = wistiaMatch ? wistiaMatch[1] : url.split('/').pop();
      return {
        embedUrl: `https://fast.wistia.net/embed/iframe/${videoId}`,
        isSupported: true,
        detectedProvider: 'wistia'
      };
    }

    // Generic iframe support for direct embed URLs
    if (url.includes('embed') || url.includes('player')) {
      return {
        embedUrl: url,
        isSupported: true,
        detectedProvider: provider || 'generic'
      };
    }

    // Instagram (handled separately)
    if (url.includes('instagram.com') || provider === 'instagram') {
      return {
        embedUrl: url,
        isSupported: true,
        detectedProvider: 'instagram'
      };
    }

    return {
      embedUrl: url,
      isSupported: false,
      detectedProvider: provider || 'unknown'
    };
  };

  const getLinkPreview = (url: string) => {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      
      // Use a more reliable preview image service
      const previewImage = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
      
      return {
        domain: domain,
        favicon: favicon,
        previewImage: previewImage,
        protocol: urlObj.protocol,
        pathname: urlObj.pathname
      };
    } catch {
      return {
        domain: 'Unknown',
        favicon: null,
        previewImage: null,
        protocol: '',
        pathname: ''
      };
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Resources</h1>
          <p className="text-gray-600">Add, manage, and discover your personal study materials.</p>
        </div>

        

        {/* Public Community Resources Section */} 
        <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">My Study Resources</h2>
        </div>
      
      {['Study Resources', 'Tools', 'Exam Motivation'].map(category => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {resources
              .filter(resource => resource.category === category)
              .map((resource) => {
                const linkPreview = resource.type === 'link' ? getLinkPreview(resource.url) : null;
                const videoInfo = resource.type === 'video' ? getVideoEmbedUrl(resource.url, resource.provider) : null;
                
                return (
                  <div 
                    key={resource.id} 
                    className={`border border-gray-200 rounded-xl shadow-md bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden ${
                      resource.type === 'video' ? 'h-auto' : 'h-auto' // Changed from h-48 to h-auto for link types
                    }`}
                  >
                    {resource.type === 'video' ? (
                      // Video Card Design
                      <div className="h-full">
                        <div className="p-4 pb-2 relative"> {/* Added relative for positioning */} 
                          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{resource.title}</h3>
                          {currentUser && (
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteResource(resource.id); }}
                              className="absolute top-2 right-2 p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                              aria-label="Delete resource"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                          <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              📹 Video
                            </span>
                            {videoInfo && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                {videoInfo.detectedProvider}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="px-4 pb-4">
                          {videoInfo?.detectedProvider === 'instagram' ? (
                            <div className="min-h-[240px] flex items-center justify-center">
                              <blockquote 
                                className="instagram-media" 
                                data-instgrm-captioned 
                                data-instgrm-permalink={resource.url} 
                                data-instgrm-version="14"
                                style={{
                                  background: '#FFF',
                                  border: '0',
                                  borderRadius: '3px',
                                  boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)',
                                  margin: '1px',
                                  maxWidth: '100%',
                                  minWidth: '326px',
                                  padding: '0',
                                  textAlign: 'center' as const
                                }}
                              >
                                <div style={{padding: '16px'}}>
                                  <a 
                                    href={resource.url}
                                    style={{
                                      background: '#FFFFFF',
                                      lineHeight: '0',
                                      padding: '0 0',
                                      textAlign: 'center' as const,
                                      textDecoration: 'none',
                                      width: '100%'
                                    }}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    View this post on Instagram
                                  </a>
                                </div>
                              </blockquote>
                            </div>
                          ) : videoInfo?.isSupported ? (
                            <div className="relative">
                              <iframe 
                                src={videoInfo.embedUrl} 
                                width="100%" 
                                height="240" 
                                frameBorder="0" 
                                allowFullScreen 
                                className="rounded-lg"
                                title={resource.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              />
                            </div>
                          ) : (
                            <div className="h-[240px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                              <div className="text-center p-6">
                                <div className="text-3xl mb-3">🎥</div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Video not embeddable</p>
                                <p className="text-xs text-gray-500 mb-3">
                                  Provider: {videoInfo?.detectedProvider || 'unknown'}
                                </p>
                                <a 
                                  href={resource.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                  Watch Video
                                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Link Card Design with Preview Image
                      <a 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block min-h-[300px] hover:bg-gray-50 transition-colors group"
                      >
                        <div className="min-h-[300px] flex flex-col">
                         
                          
                          {/* Content Section */}
                          <div className="p-4 flex-1 flex flex-col relative"> {/* Added relative for positioning */} 
                            {currentUser && (
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteResource(resource.id); }}
                                className="absolute top-2 right-2 p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors z-10" // Added z-10 to ensure it's above image
                                aria-label="Delete resource"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                            <div className="flex items-start gap-3 flex-1">
                              <div className="flex-shrink-0 mt-1">
                                {linkPreview?.favicon ? (
                                  <img 
                                    src={linkPreview.favicon} 
                                    alt="" 
                                    className="w-5 h-5 rounded"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-5 h-5 bg-gray-300 rounded flex items-center justify-center">
                                    <span className="text-xs text-gray-600">🌐</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 leading-tight text-sm">
                                  {resource.title}
                                </h3>
                                <p className="text-xs text-gray-600 mb-1 truncate">
                                  {linkPreview?.domain || 'External Link'}
                                </p>
                                <p className="text-xs text-gray-500 line-clamp-2">
                                  {linkPreview?.pathname && linkPreview.pathname !== '/' 
                                    ? linkPreview.pathname.slice(1, 40) + (linkPreview.pathname.length > 40 ? '...' : '')
                                    : 'Click to visit this resource'
                                  }
                                </p>
                              </div>
                            </div>
                             {/* Preview Image Section */}
                          <div className="h-24 border-b-2 rounded-sm border-gray-200 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                            {linkPreview?.previewImage ? (
                              <img 
                                src={linkPreview.previewImage} 
                                alt={`Preview of ${resource.title}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.parentElement) {
                                    e.currentTarget.parentElement.innerHTML = `
                                      <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                                        <div class="text-center">
                                          <div class="text-2xl text-blue-400 mb-1">🔗</div>
                                          <p class="text-xs text-blue-600 font-medium">${linkPreview.domain}</p>
                                        </div>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                                <div className="text-center">
                                  <div className="text-2xl text-blue-400 mb-1">🔗</div>
                                  <p className="text-xs text-blue-600 font-medium">{linkPreview?.domain || 'Link'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                            
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  🔗 Link
                                </span>
                                <div className="flex items-center text-blue-600 text-xs group-hover:text-blue-700">
                                  <span className="mr-1">Visit</span>
                                  <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </a>
                    )}
                  </div>
                );
              })}
          </div>
          {resources.filter(resource => resource.category === category).length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-gray-500 text-lg">No resources available in this category</p>
              <p className="text-gray-400 text-sm">Resources will appear here once added</p>
            </div>
          )}
        </div>
      ))}

      {currentUser && (
        <div className="mt-12 bg-white border border-gray-200 rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-semibold">+</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">Add New Resource</h2>
          </div>
          
          <form onSubmit={handleAddResource} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Resource Title *
                </label>
                <input 
                  type="text" 
                  value={newResource.title} 
                  onChange={(e) => setNewResource({...newResource, title: e.target.value})} 
                  placeholder="Enter a descriptive title for the resource" 
                  className="border border-gray-300 rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Resource Type</label>
                <select 
                  value={newResource.type} 
                  onChange={(e) => setNewResource({...newResource, type: e.target.value as 'link' | 'video'})} 
                  className="border border-gray-300 rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="link">🔗 Link</option>
                  <option value="video">📹 Video</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select 
                  value={newResource.category} 
                  onChange={(e) => setNewResource({...newResource, category: e.target.value as 'Study Resources' | 'Tools' | 'Exam Motivation'})} 
                  className="border border-gray-300 rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="Study Resources">📚 Study Resources</option>
                  <option value="Tools">🛠️ Tools</option>
                  <option value="Exam Motivation">💪 Exam Motivation</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  URL *
                </label>
                <input 
                  type="url" 
                  value={newResource.url} 
                  onChange={(e) => setNewResource({...newResource, url: e.target.value})} 
                  placeholder="https://example.com" 
                  className="border border-gray-300 rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" 
                  required 
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Provider (for videos)
                </label>
                <select 
                  value={newResource.provider} 
                  onChange={(e) => setNewResource({...newResource, provider: e.target.value as 'youtube' | 'instagram' | undefined})} 
                  className="border border-gray-300 rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Auto-detect or select provider</option>
                  <option value="youtube">📺 YouTube</option>
                  <option value="vimeo">📹 Vimeo</option>
                  <option value="dailymotion">🎬 Dailymotion</option>
                  <option value="twitch">🎮 Twitch</option>
                  <option value="wistia">🎥 Wistia</option>
                  <option value="instagram">📸 Instagram</option>
                  <option value="generic">🌐 Generic/Other</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty for auto-detection, or select for better compatibility
                </p>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl"
            >
              Add Resource
            </button>
          </form>
          
          {message && (
            <div className={`mt-6 p-4 rounded-lg border ${
              message.includes('Error') || message.includes('Only admin') 
                ? 'bg-red-50 text-red-800 border-red-200' 
                : 'bg-green-50 text-green-800 border-green-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {message.includes('Error') || message.includes('Only admin') ? '❌' : '✅'}
                </span>
                {message}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default StudyResourcesPage;