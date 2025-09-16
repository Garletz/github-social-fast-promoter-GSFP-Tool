import type { GitHubProject, SocialPost } from '../types';

export interface SessionData {
  id: string;
  project: GitHubProject | null;
  posts: SocialPost[];
  selectedPlatforms: string[];
  createdAt: string;
  updatedAt: string;
}

export class LocalStorageManager {
  private static readonly STORAGE_KEY = 'github_social_promoter_session';
  private static readonly POSTS_KEY = 'github_social_promoter_posts';

  // Créer une nouvelle session
  static createSession(): string {
    const sessionId = this.generateSessionId();
    const sessionData: SessionData = {
      id: sessionId,
      project: null,
      posts: [],
      selectedPlatforms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
    return sessionId;
  }

  // Charger la session actuelle
  static loadCurrentSession(): SessionData | null {
    try {
      const sessionData = localStorage.getItem(this.STORAGE_KEY);
      if (sessionData) {
        return JSON.parse(sessionData);
      }
      return null;
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  }

  // Sauvegarder les données du projet
  static saveProject(project: GitHubProject): void {
    const session = this.loadCurrentSession();
    if (!session) {
      this.createSession();
      return this.saveProject(project);
    }

    session.project = project;
    session.updatedAt = new Date().toISOString();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    console.log(`Project saved for session: ${session.id}`);
  }

  // Sauvegarder les posts
  static savePosts(posts: SocialPost[]): void {
    const session = this.loadCurrentSession();
    if (!session) {
      this.createSession();
      return this.savePosts(posts);
    }

    // Ajouter des IDs uniques aux posts s'ils n'en ont pas
    const postsWithIds = posts.map((post, index) => ({
      ...post,
      id: post.id || Date.now() + index
    }));

    session.posts = postsWithIds;
    session.updatedAt = new Date().toISOString();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(this.POSTS_KEY, JSON.stringify(postsWithIds));
    console.log(`Posts saved for session: ${session.id}`);
  }

  // Sauvegarder les plateformes sélectionnées
  static saveSelectedPlatforms(platforms: string[]): void {
    const session = this.loadCurrentSession();
    if (!session) {
      this.createSession();
      return this.saveSelectedPlatforms(platforms);
    }

    session.selectedPlatforms = platforms;
    session.updatedAt = new Date().toISOString();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    console.log(`Selected platforms saved for session: ${session.id}`);
  }

  // Mettre à jour un post spécifique
  static updatePost(postId: number, updates: Partial<SocialPost>): void {
    const session = this.loadCurrentSession();
    if (!session) return;

    const postIndex = session.posts.findIndex(post => post.id === postId);
    if (postIndex !== -1) {
      session.posts[postIndex] = { ...session.posts[postIndex], ...updates };
      session.updatedAt = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
      localStorage.setItem(this.POSTS_KEY, JSON.stringify(session.posts));
      console.log(`Post ${postId} updated`);
    }
  }

  // Supprimer la session actuelle
  static deleteCurrentSession(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.POSTS_KEY);
    console.log('Session deleted');
  }

  // Lister toutes les sessions (pour le futur)
  static listSessions(): Array<{id: string, createdAt: string, updatedAt: string}> {
    const session = this.loadCurrentSession();
    return session ? [{
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }] : [];
  }

  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
