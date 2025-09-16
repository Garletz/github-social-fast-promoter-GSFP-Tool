import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GitHubProject, SocialPost, PlatformConfig } from '../types';
import { PLATFORMS } from './platforms';

export class GeminiContentGenerator {
  private genAI: GoogleGenerativeAI;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private readonly RATE_LIMIT_DELAY = 3000; // 3 secondes entre les requêtes pour éviter le quota
  private readonly MAX_REQUESTS_PER_SESSION = 40; // Limite pour éviter de dépasser le quota gratuit

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateSocialPosts(project: GitHubProject, platforms: PlatformConfig[], customInstructions?: string): Promise<SocialPost[]> {
    console.log(`🚀 Generating posts for ${platforms.length} platforms...`);
    
    // Vérifier la limite de requêtes
    if (this.requestCount >= this.MAX_REQUESTS_PER_SESSION) {
      console.warn(`⚠️ Limite de requêtes atteinte (${this.MAX_REQUESTS_PER_SESSION}). Utilisation des posts de fallback.`);
      return platforms.map(platform => this.createFallbackPost(project, platform));
    }
    
    // Grouper les plateformes par type pour optimiser les requêtes
    const platformGroups = this.groupPlatformsByType(platforms);
    const posts: SocialPost[] = [];

    // Traiter chaque groupe en parallèle
    const groupPromises = platformGroups.map(async (group) => {
      if (group.platforms.length === 1) {
        // Une seule plateforme = requête individuelle
        return await this.generatePostForPlatform(project, group.platforms[0]);
      } else {
        // Plusieurs plateformes = requête groupée
        return await this.generatePostsForGroup(project, group, customInstructions);
      }
    });

    try {
      const results = await Promise.all(groupPromises);
      // Aplatir les résultats
      results.forEach(result => {
        if (Array.isArray(result)) {
          posts.push(...result);
        } else {
          posts.push(result);
        }
      });
    } catch (error) {
      console.error('Error in batch generation, falling back to individual requests:', error);
      // Fallback : requêtes individuelles
      for (const platform of platforms) {
        try {
          const post = await this.generatePostForPlatform(project, platform);
          posts.push(post);
        } catch (error) {
          console.error(`Erreur génération post pour ${platform.name}:`, error);
          // Créer un post de fallback
          const fallbackPost = this.createFallbackPost(project, platform);
          posts.push(fallbackPost);
        }
      }
    }

    console.log(`✅ Generated ${posts.length} posts successfully`);
    return posts;
  }

  private groupPlatformsByType(platforms: PlatformConfig[]): Array<{type: string, platforms: PlatformConfig[]}> {
    const groups: Record<string, PlatformConfig[]> = {};

    platforms.forEach(platform => {
      // Déterminer le type de plateforme
      let type = 'other';
      
      if (platform.categories.includes('Social Media')) {
        type = 'social';
      } else if (platform.categories.includes('Launch Platform')) {
        type = 'launch';
      } else if (platform.categories.includes('Professional')) {
        type = 'professional';
      } else if (platform.categories.includes('Developer Community')) {
        type = 'developer';
      }

      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(platform);
    });

    return Object.entries(groups).map(([type, platforms]) => ({ type, platforms }));
  }

  private async generatePostsForGroup(project: GitHubProject, group: {type: string, platforms: PlatformConfig[]}, customInstructions?: string): Promise<SocialPost[]> {
    const model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      }
    });

    const platformNames = group.platforms.map(p => p.name).join(', ');
    const platformDetails = group.platforms.map(p => 
      `${p.name}: ${p.maxCharacters}ch, rules: ${p.rules.join('; ')}`
    ).join('\n');

    const prompt = `
Generate social media posts for these ${group.type} platforms: ${platformNames}

PROJECT ANALYSIS:
- Name: ${project.name}
- Type: ${project.projectType}
- Description: ${project.description}
- Language: ${project.language}
- Stars: ${project.stars.toLocaleString()}
- Key Features: ${project.keyFeatures.join(', ')}
- Topics: ${project.topics.slice(0, 3).join(', ')}

PLATFORM DETAILS:
${platformDetails}

CRITICAL REQUIREMENTS:
1. NO hashtags - use natural keywords instead
2. NO emojis - keep content professional
3. Keep posts SHORT and CONCISE
4. Focus on ONE key benefit or feature per platform
5. Adapt tone to each platform's audience
6. Stay well under character limit (use 70% max)

${customInstructions ? `
CUSTOM INSTRUCTIONS:
${customInstructions}

Please follow these additional instructions while generating the posts.
` : ''}

Response format (JSON only):
{
  "posts": [
    {
      "platform": "Platform Name",
      "title": "Short catchy headline",
      "content": "Very short post content",
      "hashtags": [],
      "copyText": "Complete text ready to copy-paste"
    }
  ]
}
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const data = JSON.parse(jsonMatch[0]);
      const posts: SocialPost[] = [];

      data.posts.forEach((postData: any, index: number) => {
        const platform = group.platforms[index];
        if (platform) {
          posts.push({
            id: Date.now() + index,
            platform: platform.name,
            title: postData.title || '',
            content: postData.content || '',
            hashtags: postData.hashtags || [],
            characterCount: postData.copyText?.length || 0,
            maxCharacters: platform.maxCharacters,
            url: platform.url,
            copyText: postData.copyText || ''
          });
        }
      });

      return posts;
    } catch (error) {
      console.error('Error in group generation:', error);
      // Fallback to individual generation
      const posts: SocialPost[] = [];
      for (const platform of group.platforms) {
        try {
          const post = await this.generatePostForPlatform(project, platform);
          posts.push(post);
        } catch (error) {
          console.error(`Error generating post for ${platform.name}:`, error);
          // Créer un post de fallback
          const fallbackPost = this.createFallbackPost(project, platform);
          posts.push(fallbackPost);
        }
      }
      return posts;
    }
  }

  async modifySocialPosts(project: GitHubProject, posts: SocialPost[], modificationInstruction: string): Promise<SocialPost[]> {
    console.log(`🔧 Modifying ${posts.length} posts with instruction: "${modificationInstruction}"`);
    
    // Grouper les posts par type de plateforme pour optimiser les requêtes
    const postGroups = this.groupPostsByPlatformType(posts);
    const modifiedPosts: SocialPost[] = [];

    // Traiter chaque groupe en parallèle
    const groupPromises = postGroups.map(async (group) => {
      if (group.posts.length === 1) {
        // Un seul post = requête individuelle
        return await this.modifyPostForPlatform(project, group.posts[0], modificationInstruction);
      } else {
        // Plusieurs posts = requête groupée
        return await this.modifyPostsForGroup(project, group, modificationInstruction);
      }
    });

    try {
      const results = await Promise.all(groupPromises);
      // Aplatir les résultats
      results.forEach(result => {
        if (Array.isArray(result)) {
          modifiedPosts.push(...result);
        } else {
          modifiedPosts.push(result);
        }
      });
    } catch (error) {
      console.error('Error in batch modification, falling back to individual requests:', error);
      // Fallback : requêtes individuelles
      for (const post of posts) {
        try {
          const modifiedPost = await this.modifyPostForPlatform(project, post, modificationInstruction);
          modifiedPosts.push(modifiedPost);
        } catch (error) {
          console.error(`Erreur modification post pour ${post.platform}:`, error);
          // En cas d'erreur, garder le post original
          modifiedPosts.push(post);
        }
      }
    }

    console.log(`✅ Modified ${modifiedPosts.length} posts successfully`);
    return modifiedPosts;
  }

  private groupPostsByPlatformType(posts: SocialPost[]): Array<{type: string, posts: SocialPost[]}> {
    const groups: Record<string, SocialPost[]> = {};

    posts.forEach(post => {
      // Déterminer le type de plateforme
      let type = 'other';
      
      if (post.platform.includes('Twitter') || post.platform.includes('X')) {
        type = 'social';
      } else if (post.platform.includes('Product Hunt') || post.platform.includes('OpenHunt') || post.platform.includes('BetaList')) {
        type = 'launch';
      } else if (post.platform.includes('LinkedIn')) {
        type = 'professional';
      } else if (post.platform.includes('Dev.to') || post.platform.includes('Hacker News')) {
        type = 'developer';
      } else if (post.platform.includes('Reddit')) {
        type = 'community';
      }

      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(post);
    });

    return Object.entries(groups).map(([type, posts]) => ({ type, posts }));
  }

  private async modifyPostsForGroup(project: GitHubProject, group: {type: string, posts: SocialPost[]}, instruction: string): Promise<SocialPost[]> {
    const model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      }
    });

    const postDetails = group.posts.map((post, index) => 
      `${index + 1}. ${post.platform}: "${post.content}" (${post.characterCount}/${post.maxCharacters} chars)`
    ).join('\n');

    const prompt = `
Modify these existing social media posts for ${group.type} platforms based on the user's instruction.

ORIGINAL POSTS:
${postDetails}

PROJECT INFO:
- Name: ${project.name}
- Type: ${project.projectType}
- Description: ${project.description}
- Language: ${project.language}
- Key Features: ${project.keyFeatures.join(', ')}

USER INSTRUCTION:
"${instruction}"

MODIFICATION REQUIREMENTS:
1. Apply the user's instruction to ALL posts
2. NO hashtags - use natural keywords instead
3. NO emojis - keep content professional
4. Keep posts SHORT and CONCISE
5. Maintain each platform's tone and style
6. Respect character limits for each platform
7. Focus on the requested changes

Response format (JSON only):
{
  "posts": [
    {
      "platform": "Platform Name",
      "title": "Modified headline",
      "content": "Modified post content",
      "hashtags": [],
      "copyText": "Complete modified text ready to copy-paste"
    }
  ]
}
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const data = JSON.parse(jsonMatch[0]);
      const modifiedPosts: SocialPost[] = [];

      data.posts.forEach((postData: any, index: number) => {
        const originalPost = group.posts[index];
        if (originalPost) {
          modifiedPosts.push({
            id: originalPost.id,
            platform: originalPost.platform,
            title: postData.title || originalPost.title,
            content: postData.content || originalPost.content,
            hashtags: postData.hashtags || [],
            characterCount: postData.copyText?.length || 0,
            maxCharacters: originalPost.maxCharacters,
            url: originalPost.url,
            copyText: postData.copyText || originalPost.copyText
          });
        }
      });

      return modifiedPosts;
    } catch (error) {
      console.error('Error in group modification:', error);
      // Fallback to individual modification
      const modifiedPosts: SocialPost[] = [];
      for (const post of group.posts) {
        try {
          const modifiedPost = await this.modifyPostForPlatform(project, post, instruction);
          modifiedPosts.push(modifiedPost);
        } catch (error) {
          console.error(`Error modifying post for ${post.platform}:`, error);
          modifiedPosts.push(post); // Keep original post
        }
      }
      return modifiedPosts;
    }
  }

  async findRelevantCommunities(project: GitHubProject): Promise<{x: string[], reddit: string[]}> {
    try {
      console.log('🔍 Finding target communities for project:', project.name);
      console.log('📊 Project analysis:', {
        type: project.projectType,
        language: project.language,
        topics: project.topics,
        features: project.keyFeatures
      });

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.3,
        }
      });

      const prompt = `
Analyze this GitHub open source project and suggest the most relevant communities for promotion.

PROJECT DETAILS:
- Name: ${project.name}
- Type: ${project.projectType}
- Description: ${project.description}
- Language: ${project.language}
- Stars: ${project.stars.toLocaleString()}
- Topics: ${project.topics.join(', ')}
- Key Features: ${project.keyFeatures.join(', ')}
- README: ${project.readme.substring(0, 500)}...

AVAILABLE X COMMUNITIES:
- TypeScript Community
- React Community
- OpenSource Community
- WebDev Community
- API Community
- GitHub Community
- Programming Community
- AI Community
- JavaScript Community
- Python Community
- Node.js Community
- Vue.js Community
- Angular Community
- DevOps Community
- Mobile Dev Community

AVAILABLE REDDIT COMMUNITIES:
- r/programming
- r/webdev
- r/opensource
- r/typescript
- r/github
- r/reactjs
- r/node
- r/python
- r/learnpython
- r/datascience
- r/vuejs
- r/angular
- r/rest
- r/graphql
- r/reactnative
- r/flutter
- r/ios
- r/android
- r/machinelearning
- r/artificial
- r/deeplearning
- r/ai
- r/devops
- r/docker
- r/kubernetes
- r/aws
- r/coding
- r/mobile

TASK:
Based on the project analysis, select the 5 most relevant X communities and 5 most relevant Reddit communities for promoting this open source project.

Consider:
1. The project's technology stack and language
2. The project's purpose and target audience
3. The project's features and functionality
4. The community's interest in similar projects
5. The project's complexity and technical level

Response format (JSON only):
{
  "x": ["Community1", "Community2", "Community3", "Community4", "Community5"],
  "reddit": ["r/community1", "r/community2", "r/community3", "r/community4", "r/community5"],
  "reasoning": "Brief explanation of why these communities are most relevant"
}
`;

      console.log('🤖 Asking Gemini for community recommendations...');
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('📝 Gemini response:', text);

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from Gemini');
      }

      const data = JSON.parse(jsonMatch[0]);
      
      console.log('✅ Gemini recommended communities:', {
        x: data.x,
        reddit: data.reddit,
        reasoning: data.reasoning
      });

      // Validation des communautés recommandées
      const validXCommunities = this.validateXCommunities(data.x);
      const validRedditCommunities = this.validateRedditCommunities(data.reddit);

      return {
        x: validXCommunities,
        reddit: validRedditCommunities
      };

    } catch (error) {
      console.error('❌ Error finding communities with Gemini:', error);
      console.log('📋 Falling back to automated selection...');
      
      // Fallback vers l'ancienne méthode automatisée
      return this.getFallbackCommunities(project);
    }
  }

  private validateXCommunities(communities: string[]): string[] {
    const validCommunities = [
      'TypeScript Community', 'React Community', 'OpenSource Community', 'WebDev Community',
      'API Community', 'GitHub Community', 'Programming Community', 'AI Community',
      'JavaScript Community', 'Python Community', 'Node.js Community', 'Vue.js Community',
      'Angular Community', 'DevOps Community', 'Mobile Dev Community'
    ];

    return communities
      .filter(community => validCommunities.includes(community))
      .slice(0, 5);
  }

  private validateRedditCommunities(communities: string[]): string[] {
    const validCommunities = [
      'r/programming', 'r/webdev', 'r/opensource', 'r/typescript', 'r/github',
      'r/reactjs', 'r/node', 'r/python', 'r/learnpython', 'r/datascience',
      'r/vuejs', 'r/angular', 'r/rest', 'r/graphql', 'r/reactnative',
      'r/flutter', 'r/ios', 'r/android', 'r/machinelearning', 'r/artificial',
      'r/deeplearning', 'r/ai', 'r/devops', 'r/docker', 'r/kubernetes',
      'r/aws', 'r/coding', 'r/mobile'
    ];

    return communities
      .filter(community => validCommunities.includes(community))
      .slice(0, 5);
  }


  private getFallbackCommunities(project: GitHubProject): {x: string[], reddit: string[]} {
    const projectType = project.projectType.toLowerCase();
    const language = project.language.toLowerCase();

    // Communautés X selon le type de projet
    let xCommunities = ['OpenSource Community', 'Programming Community'];
    
    if (projectType.includes('web') || language === 'javascript' || language === 'typescript') {
      xCommunities.push('WebDev Community', 'JavaScript Community', 'TypeScript Community');
    } else if (language === 'python') {
      xCommunities.push('Python Community', 'AI Community', 'DataScience Community');
    } else if (projectType.includes('mobile')) {
      xCommunities.push('Mobile Dev Community', 'React Community', 'JavaScript Community');
    } else {
      xCommunities.push('WebDev Community', 'GitHub Community', 'API Community');
    }

    // Subreddits Reddit selon le type de projet
    let redditCommunities = ['r/programming', 'r/opensource'];
    
    if (projectType.includes('web') || language === 'javascript' || language === 'typescript') {
      redditCommunities.push('r/webdev', 'r/javascript', 'r/typescript');
    } else if (language === 'python') {
      redditCommunities.push('r/python', 'r/datascience', 'r/machinelearning');
    } else if (projectType.includes('mobile')) {
      redditCommunities.push('r/reactnative', 'r/flutter', 'r/mobile');
    } else {
      redditCommunities.push('r/webdev', 'r/github', 'r/coding');
    }

    return {
      x: xCommunities.slice(0, 5),
      reddit: redditCommunities.slice(0, 5)
    };
  }

  private async generatePostForPlatform(project: GitHubProject, platform: PlatformConfig): Promise<SocialPost> {
    try {
      // Appliquer le rate limiting
      await this.rateLimit();
      
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        }
      });

      const prompt = this.buildPrompt(project, platform);
      
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseGeneratedContent(text, platform, project);
    } catch (error) {
      console.error(`Error generating post for ${platform.name}:`, error);
      
      // Vérifier si c'est une erreur de quota
      if (this.isQuotaExceededError(error)) {
        return this.createFallbackPost(project, platform);
      }
      
      // Return fallback content if API fails
      const fallbackContent = this.generateFallbackContent(project, platform);
      return {
        platform: platform.name,
        title: `Check out ${project.name}`,
        content: fallbackContent.content,
        hashtags: fallbackContent.hashtags,
        characterCount: fallbackContent.content.length,
        maxCharacters: platform.maxCharacters,
        url: platform.url,
        copyText: fallbackContent.copyText
      };
    }
  }

  private buildPrompt(project: GitHubProject, platform: PlatformConfig): string {
    const communityGuidelines = this.getCommunityGuidelines(platform.name);
    
    return `
Generate a SHORT, engaging social media post in English for ${platform.name} about this GitHub project.

PROJECT ANALYSIS:
- Name: ${project.name}
- Type: ${project.projectType}
- Description: ${project.description}
- Language: ${project.language}
- Stars: ${project.stars.toLocaleString()}
- Key Features: ${project.keyFeatures.join(', ')}
- Topics: ${project.topics.slice(0, 3).join(', ')}

PLATFORM CONSTRAINTS:
- Maximum ${platform.maxCharacters} characters (STRICT LIMIT)
- Maximum ${platform.hashtagLimit} hashtags (STRICT LIMIT)
- Rules: ${platform.rules.join(', ')}

    COMMUNITY GUIDELINES FOR ${platform.name.toUpperCase()}:
    ${communityGuidelines}
    
    ${platform.isCommunity ? `
    IMPORTANT: This is a COMMUNITY post for ${platform.name}.
    - Adapt the content to the specific community
    - Follow community rules and culture
    - Use community-appropriate language and tone
    - Make it relevant to community members
    ` : ''}

CRITICAL REQUIREMENTS:
1. Keep posts SHORT and CONCISE
2. NO hashtags - use natural keywords instead
3. NO emojis - keep content professional
4. Focus on ONE key benefit or feature
5. Use simple, clear language
6. End with a simple call-to-action
7. Stay well under character limit (use 70% max)

Response format (JSON only):
{
  "title": "Short catchy headline",
  "content": "Very short post content",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "copyText": "Complete text ready to copy-paste"
}
`;
  }

  private getCommunityGuidelines(platformName: string): string {
    const guidelines: Record<string, string> = {
      'Twitter/X': `- Ultra-short, punchy language
- ONE emoji maximum
- Focus on ONE key benefit
- Use 1-2 hashtags max
- End with simple CTA`,

      'LinkedIn': `- Professional, concise tone
- Focus on business value
- Mention ONE key technology
- Use 2-3 professional hashtags
- End with professional CTA`,

      'Product Hunt': `- Product-focused, short
- Highlight ONE unique feature
- Mention target audience briefly
- Use 2-3 product hashtags
- End with action CTA`,

      'Reddit': `- Informative but concise
- Include ONE technical detail
- Mention community benefit
- No hashtags
- End with discussion prompt`,

      'Dev.to': `- Technical but accessible
- Mention ONE key feature
- Use 2-3 developer hashtags
- Share ONE insight
- End with engagement CTA`,

      'Hacker News - Show HN': `- Factual, technical
- Focus on ONE innovation
- Mention ONE challenge solved
- No hashtags
- End with discussion invitation`,

      'Indie Hackers': `- Business-focused, short
- Mention ONE business aspect
- Use 2-3 business hashtags
- Share ONE lesson
- End with business CTA`,

      'GitHub Trending': `- Technical excellence focus
- Highlight ONE quality aspect
- Use 2-3 tech hashtags
- Mention ONE impact
- End with contribution CTA`,

      'Facebook': `- Friendly, accessible
- Focus on ONE practical benefit
- Use 2-3 popular hashtags
- Share ONE insight
- End with social CTA`,

      'Instagram': `- Visual, creative
- Use ONE emoji
- Focus on ONE aesthetic aspect
- Use 3-5 lifestyle hashtags
- End with visual CTA`
    };

    return guidelines[platformName] || `- Professional, concise tone
- Focus on ONE key benefit
- Use 2-3 relevant hashtags
- Include clear value proposition
- End with simple call-to-action`;
  }

  private parseGeneratedContent(text: string, platform: PlatformConfig, project: GitHubProject): SocialPost {
    try {
      // Extraire le JSON de la réponse
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Format de réponse invalide');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const fullContent = `${parsed.content} ${parsed.hashtags.join(' ')}`;
      
      return {
        id: Date.now() + Math.random(), // ID temporaire
        platform: platform.name,
        title: parsed.title,
        content: parsed.content,
        hashtags: parsed.hashtags,
        characterCount: fullContent.length,
        maxCharacters: platform.maxCharacters,
        url: platform.url,
        copyText: parsed.copyText || fullContent
      };
    } catch (error) {
      // Fallback in case of parsing error
      const fallbackContent = this.generateFallbackContent(project, platform);
      return {
        id: Date.now() + Math.random(), // ID temporaire
        platform: platform.name,
        title: `Check out ${project.name}`,
        content: fallbackContent.content,
        hashtags: fallbackContent.hashtags,
        characterCount: fallbackContent.content.length,
        maxCharacters: platform.maxCharacters,
        url: platform.url,
        copyText: fallbackContent.copyText
      };
    }
  }

  private generateFallbackContent(project: GitHubProject, platform: PlatformConfig): { content: string; hashtags: string[]; copyText: string } {
    const baseHashtags = [`#${project.language.toLowerCase()}`, '#opensource'];
    const platformHashtags = this.getPlatformSpecificHashtags(platform.name);
    const hashtags = [...baseHashtags, ...platformHashtags].slice(0, Math.min(platform.hashtagLimit, 3));
    
    let content = '';
    
    switch (platform.name) {
      case 'Twitter/X':
        content = `🚀 ${project.name}: ${project.description.substring(0, 100)}`;
        break;
      case 'LinkedIn':
        content = `${project.name} - ${project.description.substring(0, 120)}. Built with ${project.language}.`;
        break;
      case 'Product Hunt':
        content = `🚀 ${project.name}! ${project.description.substring(0, 100)}`;
        break;
      case 'Reddit':
        content = `${project.name} - ${project.description.substring(0, 150)}. ${project.language} project. Thoughts?`;
        break;
      case 'Dev.to':
        content = `💻 ${project.name}: ${project.description.substring(0, 100)}`;
        break;
      case 'Hacker News - Show HN':
        content = `Show HN: ${project.name} - ${project.description.substring(0, 120)}`;
        break;
      case 'Indie Hackers':
        content = `${project.name} - ${project.description.substring(0, 120)}. ${project.language} project.`;
        break;
      default:
        content = `🚀 ${project.name}: ${project.description.substring(0, 100)}`;
    }
    
    const copyText = `${content} ${hashtags.join(' ')} ${project.url}`;
    
    return { content, hashtags, copyText };
  }

  private getPlatformSpecificHashtags(platformName: string): string[] {
    const hashtagMap: Record<string, string[]> = {
      'Twitter/X': ['#tech', '#coding'],
      'LinkedIn': ['#technology', '#innovation'],
      'Product Hunt': ['#product', '#startup'],
      'Reddit': ['#programming'],
      'Dev.to': ['#webdev', '#coding'],
      'Hacker News - Show HN': ['#showhn'],
      'Indie Hackers': ['#indiehackers', '#entrepreneur'],
      'GitHub Trending': ['#trending'],
      'Facebook': ['#technology', '#programming'],
      'Instagram': ['#tech', '#coding', '#developer']
    };
    
    return hashtagMap[platformName] || ['#tech'];
  }

  private async modifyPostForPlatform(project: GitHubProject, originalPost: SocialPost, instruction: string): Promise<SocialPost> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        }
      });

      const platform = PLATFORMS.find(p => p.name === originalPost.platform);
      if (!platform) {
        return originalPost;
      }

      const prompt = this.buildModificationPrompt(project, originalPost, platform, instruction);
      
      console.log(`Modifying post for ${originalPost.platform} with instruction: ${instruction}`);
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseGeneratedContent(text, platform, project);
    } catch (error) {
      console.error(`Error modifying post for ${originalPost.platform}:`, error);
      return originalPost;
    }
  }

  private buildModificationPrompt(project: GitHubProject, originalPost: SocialPost, platform: PlatformConfig, instruction: string): string {
    return `
Modify this existing social media post for ${platform.name} based on the user's instruction.

ORIGINAL POST:
- Platform: ${originalPost.platform}
- Content: ${originalPost.content}
- Hashtags: ${originalPost.hashtags.join(', ')}
- Character count: ${originalPost.characterCount}/${originalPost.maxCharacters}

PROJECT INFO:
- Name: ${project.name}
- Type: ${project.projectType}
- Description: ${project.description}
- Language: ${project.language}
- Key Features: ${project.keyFeatures.join(', ')}

USER INSTRUCTION:
"${instruction}"

PLATFORM CONSTRAINTS:
- Maximum ${platform.maxCharacters} characters (STRICT LIMIT)
- Maximum ${platform.hashtagLimit} hashtags (STRICT LIMIT)

MODIFICATION REQUIREMENTS:
1. Apply the user's instruction while keeping the post SHORT and CONCISE
2. Maintain the platform's tone and style
3. Respect character and hashtag limits
4. Keep the same call-to-action style
5. Focus on the requested changes

Response format (JSON only):
{
  "title": "Modified headline",
  "content": "Modified post content",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "copyText": "Complete modified text ready to copy-paste"
}
`;
  }

  // Fonction pour gérer le rate limiting
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const delay = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  // Fonction pour détecter les erreurs de quota
  private isQuotaExceededError(error: any): boolean {
    if (error?.message?.includes('429')) return true;
    if (error?.message?.includes('quota')) return true;
    if (error?.message?.includes('exceeded')) return true;
    return false;
  }

  // Fonction pour créer des posts de fallback quand l'API échoue
  private createFallbackPost(project: GitHubProject, platform: PlatformConfig): SocialPost {
    console.log(`🔄 Creating fallback post for ${platform.name}`);
    
    // Templates de base selon le type de plateforme
    let title = '';
    let content = '';
    let copyText = '';

    const projectName = project.name;
    const description = project.description || 'Open source project';
    const language = project.language;

    // Adapter le contenu selon la plateforme
    if (platform.name.includes('Twitter') || platform.name.includes('X')) {
      title = `${projectName}`;
      content = `${description}`;
      copyText = `${projectName}: ${description}`;
    } else if (platform.name.includes('Reddit')) {
      title = `${projectName} - ${description}`;
      content = `Just released ${projectName}, a ${language} project. ${description}`;
      copyText = `**${title}**\n\n${content}`;
    } else if (platform.name.includes('Product Hunt')) {
      title = `${projectName}`;
      content = `${description}`;
      copyText = `${projectName} - ${description}`;
    } else if (platform.name.includes('LinkedIn')) {
      title = `New ${language} project: ${projectName}`;
      content = `Excited to share ${projectName}! ${description}`;
      copyText = `${title}\n\n${content}`;
    } else if (platform.name.includes('Dev.to') || platform.name.includes('Hacker News')) {
      title = `${projectName}: ${description}`;
      content = `Built ${projectName} using ${language}. ${description}`;
      copyText = `${title}\n\n${content}`;
    } else {
      // Template générique
      title = `${projectName}`;
      content = `${description}`;
      copyText = `${projectName}: ${description}`;
    }

    // Limiter la longueur selon les contraintes de la plateforme
    if (copyText.length > platform.maxCharacters) {
      copyText = copyText.substring(0, platform.maxCharacters - 3) + '...';
    }

    return {
      id: Date.now() + Math.random(),
      platform: platform.name,
      title: title,
      content: content,
      hashtags: [],
      characterCount: copyText.length,
      maxCharacters: platform.maxCharacters,
      url: platform.url,
      copyText: copyText
    };
  }
}
