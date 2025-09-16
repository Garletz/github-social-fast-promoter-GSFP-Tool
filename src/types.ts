export interface GitHubProject {
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  forks: number;
  topics: string[];
  readme: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  projectType: string;
  keyFeatures: string[];
}

export interface SocialPost {
  id?: number;
  platform: string;
  title: string;
  content: string;
  hashtags: string[];
  characterCount: number;
  maxCharacters: number;
  url: string;
  copyText: string;
}

export interface PlatformConfig {
  name: string;
  maxCharacters: number;
  hashtagLimit: number;
  url: string;
  categories: string[];
  rules: string[];
  isCommunity?: boolean;
  parentPlatform?: string;
}
