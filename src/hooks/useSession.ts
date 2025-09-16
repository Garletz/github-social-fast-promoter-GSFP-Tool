import { useState, useEffect, useCallback } from 'react';
import type { GitHubProject, SocialPost } from '../types';
import { LocalStorageManager } from '../lib/localStorage';

export interface UseSessionReturn {
  project: GitHubProject | null;
  posts: SocialPost[];
  selectedPlatforms: string[];
  isLoading: boolean;
  saveProject: (project: GitHubProject) => void;
  savePosts: (posts: SocialPost[]) => void;
  saveSelectedPlatforms: (platforms: string[]) => void;
  updatePost: (postId: number, updates: Partial<SocialPost>) => void;
  resetSession: () => void;
  loadSession: () => void;
}

export function useSession(): UseSessionReturn {
  const [project, setProject] = useState<GitHubProject | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger la session au démarrage
  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = useCallback(() => {
    try {
      const sessionData = LocalStorageManager.loadCurrentSession();
      if (sessionData) {
        setProject(sessionData.project);
        setPosts(sessionData.posts);
        setSelectedPlatforms(sessionData.selectedPlatforms);
        console.log('Session loaded successfully');
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveProject = useCallback((newProject: GitHubProject) => {
    try {
      LocalStorageManager.saveProject(newProject);
      setProject(newProject);
      console.log('Project saved to session');
    } catch (error) {
      console.error('Error saving project:', error);
    }
  }, []);

  const savePosts = useCallback((newPosts: SocialPost[]) => {
    try {
      LocalStorageManager.savePosts(newPosts);
      setPosts(newPosts);
      console.log('Posts saved to session');
    } catch (error) {
      console.error('Error saving posts:', error);
    }
  }, []);

  const saveSelectedPlatforms = useCallback((platforms: string[]) => {
    try {
      // Éviter les sauvegardes inutiles si les plateformes n'ont pas changé
      if (JSON.stringify(platforms) === JSON.stringify(selectedPlatforms)) {
        return;
      }
      
      LocalStorageManager.saveSelectedPlatforms(platforms);
      setSelectedPlatforms(platforms);
      console.log('Selected platforms saved to session');
    } catch (error) {
      console.error('Error saving selected platforms:', error);
    }
  }, [selectedPlatforms]);

  const updatePost = useCallback((postId: number, updates: Partial<SocialPost>) => {
    try {
      // Mettre à jour dans le localStorage
      LocalStorageManager.updatePost(postId, updates);
      
      // Mettre à jour l'état local
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId ? { ...post, ...updates } : post
        )
      );
      
      console.log(`Post ${postId} updated in session`);
    } catch (error) {
      console.error('Error updating post:', error);
    }
  }, []);

  const resetSession = useCallback(() => {
    try {
      LocalStorageManager.deleteCurrentSession();
      setProject(null);
      setPosts([]);
      setSelectedPlatforms([]);
      console.log('Session reset successfully');
    } catch (error) {
      console.error('Error resetting session:', error);
    }
  }, []);

  return {
    project,
    posts,
    selectedPlatforms,
    isLoading,
    saveProject,
    savePosts,
    saveSelectedPlatforms,
    updatePost,
    resetSession,
    loadSession
  };
}
