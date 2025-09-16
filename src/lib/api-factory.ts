import type { GitHubProject, SocialPost, PlatformConfig } from '../types';

// Interface commune pour tous les générateurs de contenu
export interface ContentGenerator {
  generateSocialPosts(project: GitHubProject, platforms: PlatformConfig[], customInstructions?: string): Promise<SocialPost[]>;
  modifySocialPosts(project: GitHubProject, posts: SocialPost[], instruction: string): Promise<SocialPost[]>;
  findRelevantCommunities(project: GitHubProject): Promise<{x: string[], reddit: string[]}>;
}

// Configuration des modèles les plus économiques
export const MODEL_CONFIGS = {
  gemini: {
    model: 'gemini-1.5-flash',
    maxTokens: 2000,
    temperature: 0.7,
    cost: 'gratuit (50 req/jour)'
  },
  openai: {
    model: 'gpt-3.5-turbo',
    maxTokens: 2000,
    temperature: 0.7,
    cost: '$0.0015/1K tokens'
  },
  anthropic: {
    model: 'claude-3-haiku-20240307',
    maxTokens: 2000,
    temperature: 0.7,
    cost: '$0.25/1M tokens'
  }
};

// Factory pour créer le bon générateur selon le fournisseur
export class APIFactory {
  static createGenerator(provider: string, apiKey: string): ContentGenerator {
    switch (provider) {
      case 'gemini':
        return new GeminiContentGenerator(apiKey);
      case 'openai':
        return new OpenAIContentGenerator(apiKey);
      case 'anthropic':
        return new AnthropicContentGenerator(apiKey);
      default:
        throw new Error(`Unsupported API provider: ${provider}`);
    }
  }

  static getModelInfo(provider: string) {
    return MODEL_CONFIGS[provider as keyof typeof MODEL_CONFIGS] || MODEL_CONFIGS.gemini;
  }
}

// Import des générateurs (on va les créer)
import { GeminiContentGenerator } from './gemini';
import { OpenAIContentGenerator } from './openai';
import { AnthropicContentGenerator } from './anthropic';
