import Anthropic from '@anthropic-ai/sdk';
import type { GitHubProject, SocialPost, PlatformConfig } from '../types';

export class AnthropicContentGenerator {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  async generateSocialPosts(project: GitHubProject, platforms: PlatformConfig[], customInstructions?: string): Promise<SocialPost[]> {
    console.log(`🚀 [Anthropic] Generating posts for ${platforms.length} platforms...`);
    
    const posts: SocialPost[] = [];
    
    // Grouper les plateformes par type pour optimiser les requêtes
    const platformGroups = this.groupPlatformsByType(platforms);

    // Traiter chaque groupe en parallèle
    const groupPromises = platformGroups.map(async (group) => {
      if (group.platforms.length === 1) {
        return await this.generatePostForPlatform(project, group.platforms[0]);
      } else {
        return await this.generatePostsForGroup(project, group, customInstructions);
      }
    });

    try {
      const results = await Promise.all(groupPromises);
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
          const fallbackPost = this.createFallbackPost(project, platform);
          posts.push(fallbackPost);
        }
      }
    }

    console.log(`✅ [Anthropic] Generated ${posts.length} posts successfully`);
    return posts;
  }

  async modifySocialPosts(_project: GitHubProject, posts: SocialPost[], instruction: string): Promise<SocialPost[]> {
    console.log(`🔄 [Anthropic] Modifying ${posts.length} posts...`);
    
    const modifiedPosts: SocialPost[] = [];
    
    // Grouper les posts par type de plateforme
    const postGroups = this.groupPostsByPlatformType(posts);
    
    const groupPromises = postGroups.map(async (group) => {
      if (group.posts.length === 1) {
        return await this.modifyPostForPlatform(group.posts[0], instruction);
      } else {
        return await this.modifyPostsForGroup(group, instruction);
      }
    });

    try {
      const results = await Promise.all(groupPromises);
      results.forEach(result => {
        if (Array.isArray(result)) {
          modifiedPosts.push(...result);
        } else {
          modifiedPosts.push(result);
        }
      });
    } catch (error) {
      console.error('Error in batch modification, falling back to individual requests:', error);
      for (const post of posts) {
        try {
          const modifiedPost = await this.modifyPostForPlatform(post, instruction);
          modifiedPosts.push(modifiedPost);
        } catch (error) {
          console.error(`Error modifying post for ${post.platform}:`, error);
          modifiedPosts.push(post); // Garder le post original
        }
      }
    }

    return modifiedPosts;
  }

  async findRelevantCommunities(project: GitHubProject): Promise<{x: string[], reddit: string[]}> {
    try {
      console.log('🔍 [Anthropic] Finding target communities for project:', project.name);

      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: this.buildCommunitySearchPrompt(project)
          }
        ],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      console.log('📝 [Anthropic] Response:', text);

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from Anthropic');
      }

      const data = JSON.parse(jsonMatch[0]);
      console.log('✅ [Anthropic] Recommended communities:', data);

      return {
        x: this.validateXCommunities(data.x || []),
        reddit: this.validateRedditCommunities(data.reddit || [])
      };

    } catch (error) {
      console.error('❌ [Anthropic] Error finding communities:', error);
      return this.getFallbackCommunities(project);
    }
  }

  private async generatePostForPlatform(project: GitHubProject, platform: PlatformConfig): Promise<SocialPost> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: this.buildPrompt(project, platform)
          }
        ],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      return this.parseGeneratedContent(text, platform, project);
    } catch (error) {
      console.error(`Error generating post for ${platform.name}:`, error);
      if (this.isQuotaExceededError(error)) {
        console.warn(`⚠️ Quota exceeded for ${platform.name}, using fallback post`);
        return this.createFallbackPost(project, platform);
      }
      throw error;
    }
  }

  private async generatePostsForGroup(project: GitHubProject, group: {type: string, platforms: PlatformConfig[]}, customInstructions?: string): Promise<SocialPost[]> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: this.buildGroupPrompt(project, group, customInstructions)
          }
        ],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      return this.parseGroupContent(text, group.platforms, project);
    } catch (error) {
      console.error('Error in group generation:', error);
      const posts: SocialPost[] = [];
      for (const platform of group.platforms) {
        try {
          const post = await this.generatePostForPlatform(project, platform);
          posts.push(post);
        } catch (error) {
          console.error(`Error generating post for ${platform.name}:`, error);
          const fallbackPost = this.createFallbackPost(project, platform);
          posts.push(fallbackPost);
        }
      }
      return posts;
    }
  }

  private async modifyPostForPlatform(post: SocialPost, instruction: string): Promise<SocialPost> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: this.buildModificationPrompt(post, instruction)
          }
        ],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      return this.parseModificationContent(text, post);
    } catch (error) {
      console.error(`Error modifying post for ${post.platform}:`, error);
      return post; // Retourner le post original en cas d'erreur
    }
  }

  private async modifyPostsForGroup(group: {type: string, posts: SocialPost[]}, instruction: string): Promise<SocialPost[]> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: this.buildGroupModificationPrompt(group, instruction)
          }
        ],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      return this.parseGroupModificationContent(text, group.posts);
    } catch (error) {
      console.error('Error in group modification:', error);
      return group.posts; // Retourner les posts originaux
    }
  }

  // Méthodes utilitaires (similaires à OpenAI mais adaptées pour Anthropic)
  private groupPlatformsByType(platforms: PlatformConfig[]): {type: string, platforms: PlatformConfig[]}[] {
    const groups: {[key: string]: PlatformConfig[]} = {};
    
    platforms.forEach(platform => {
      const type = this.getPlatformType(platform);
      if (!groups[type]) groups[type] = [];
      groups[type].push(platform);
    });
    
    return Object.entries(groups).map(([type, platforms]) => ({ type, platforms }));
  }

  private groupPostsByPlatformType(posts: SocialPost[]): {type: string, posts: SocialPost[]}[] {
    const groups: {[key: string]: SocialPost[]} = {};
    
    posts.forEach(post => {
      const type = this.getPostType(post);
      if (!groups[type]) groups[type] = [];
      groups[type].push(post);
    });
    
    return Object.entries(groups).map(([type, posts]) => ({ type, posts }));
  }

  private getPlatformType(platform: PlatformConfig): string {
    if (platform.categories.includes('Social Media')) return 'social';
    if (platform.categories.includes('Product Launch')) return 'launch';
    if (platform.categories.includes('Professional')) return 'professional';
    return 'developer';
  }

  private getPostType(post: SocialPost): string {
    if (post.platform.includes('Twitter') || post.platform.includes('LinkedIn') || post.platform.includes('Facebook')) return 'social';
    if (post.platform.includes('Product Hunt') || post.platform.includes('Launch')) return 'launch';
    if (post.platform.includes('Dev.to') || post.platform.includes('Hacker News')) return 'developer';
    return 'professional';
  }

  private buildPrompt(project: GitHubProject, platform: PlatformConfig): string {
    return `
Generate a social media post for ${platform.name}

PROJECT ANALYSIS:
- Name: ${project.name}
- Type: ${project.projectType}
- Description: ${project.description}
- Language: ${project.language}
- Stars: ${project.stars.toLocaleString()}
- Key Features: ${project.keyFeatures.join(', ')}
- Topics: ${project.topics.slice(0, 3).join(', ')}

PLATFORM DETAILS:
- Platform: ${platform.name}
- Max Characters: ${platform.maxCharacters}
- Rules: ${platform.rules.join('; ')}

CRITICAL REQUIREMENTS:
1. NO hashtags - use natural keywords instead
2. NO emojis - keep content professional
3. Keep posts SHORT and CONCISE
4. Focus on ONE key benefit or feature
5. Adapt tone to platform's audience
6. Stay well under character limit (use 70% max)

Response format (JSON only):
{
  "title": "Short catchy headline",
  "content": "Very short post content",
  "hashtags": [],
  "copyText": "Complete text ready to copy-paste"
}
`;
  }

  private buildGroupPrompt(project: GitHubProject, group: {type: string, platforms: PlatformConfig[]}, customInstructions?: string): string {
    const platformNames = group.platforms.map(p => p.name).join(', ');
    const platformDetails = group.platforms.map(p =>
      `${p.name}: ${p.maxCharacters}ch, rules: ${p.rules.join('; ')}`
    ).join('\n');

    return `
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
  }

  private buildModificationPrompt(post: SocialPost, instruction: string): string {
    return `
Modify this social media post according to the user's instruction.

ORIGINAL POST:
- Platform: ${post.platform}
- Title: ${post.title}
- Content: ${post.content}
- Character Count: ${post.characterCount}/${post.maxCharacters}

USER INSTRUCTION:
${instruction}

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
  "hashtags": [],
  "copyText": "Complete modified text ready to copy-paste"
}
`;
  }

  private buildGroupModificationPrompt(group: {type: string, posts: SocialPost[]}, instruction: string): string {
    const postsDetails = group.posts.map(post => 
      `${post.platform}: "${post.content}" (${post.characterCount}/${post.maxCharacters}ch)`
    ).join('\n');

    return `
Modify these ${group.type} posts according to the user's instruction.

ORIGINAL POSTS:
${postsDetails}

USER INSTRUCTION:
${instruction}

MODIFICATION REQUIREMENTS:
1. Apply the user's instruction while keeping posts SHORT and CONCISE
2. Maintain each platform's tone and style
3. Respect character and hashtag limits
4. Keep the same call-to-action style
5. Focus on the requested changes

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
  }

  private buildCommunitySearchPrompt(project: GitHubProject): string {
    return `
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
- TypeScript Community, React Community, OpenSource Community, WebDev Community, API Community, GitHub Community, Programming Community, AI Community, JavaScript Community, Python Community, Node.js Community, Vue.js Community, Angular Community, DevOps Community, Mobile Dev Community

AVAILABLE REDDIT COMMUNITIES:
- r/programming, r/webdev, r/opensource, r/typescript, r/github, r/reactjs, r/node, r/python, r/learnpython, r/datascience, r/vuejs, r/angular, r/rest, r/graphql, r/reactnative, r/flutter, r/ios, r/android, r/machinelearning, r/artificial, r/deeplearning, r/ai, r/devops, r/docker, r/kubernetes, r/aws, r/coding, r/mobile

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
  }

  private parseGeneratedContent(text: string, platform: PlatformConfig, project: GitHubProject): SocialPost {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const data = JSON.parse(jsonMatch[0]);
      
      return {
        id: Date.now() + Math.random(),
        platform: platform.name,
        title: data.title || '',
        content: data.content || '',
        hashtags: data.hashtags || [],
        characterCount: data.copyText?.length || 0,
        maxCharacters: platform.maxCharacters,
        url: platform.url,
        copyText: data.copyText || ''
      };
    } catch (error) {
      console.error('Error parsing Anthropic response:', error);
      return this.createFallbackPost(project, platform);
    }
  }

  private parseGroupContent(text: string, platforms: PlatformConfig[], project: GitHubProject): SocialPost[] {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const data = JSON.parse(jsonMatch[0]);
      const posts: SocialPost[] = [];

      data.posts.forEach((postData: any, index: number) => {
        const platform = platforms[index];
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
      console.error('Error parsing Anthropic group response:', error);
      return platforms.map(platform => this.createFallbackPost(project, platform));
    }
  }

  private parseModificationContent(text: string, originalPost: SocialPost): SocialPost {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const data = JSON.parse(jsonMatch[0]);
      
      return {
        ...originalPost,
        title: data.title || originalPost.title,
        content: data.content || originalPost.content,
        hashtags: data.hashtags || originalPost.hashtags,
        characterCount: data.copyText?.length || originalPost.characterCount,
        copyText: data.copyText || originalPost.copyText
      };
    } catch (error) {
      console.error('Error parsing Anthropic modification response:', error);
      return originalPost;
    }
  }

  private parseGroupModificationContent(text: string, originalPosts: SocialPost[]): SocialPost[] {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const data = JSON.parse(jsonMatch[0]);
      const modifiedPosts: SocialPost[] = [];

      data.posts.forEach((postData: any, index: number) => {
        const originalPost = originalPosts[index];
        if (originalPost) {
          modifiedPosts.push({
            ...originalPost,
            title: postData.title || originalPost.title,
            content: postData.content || originalPost.content,
            hashtags: postData.hashtags || originalPost.hashtags,
            characterCount: postData.copyText?.length || originalPost.characterCount,
            copyText: postData.copyText || originalPost.copyText
          });
        }
      });

      return modifiedPosts;
    } catch (error) {
      console.error('Error parsing Anthropic group modification response:', error);
      return originalPosts;
    }
  }

  private createFallbackPost(project: GitHubProject, platform: PlatformConfig): SocialPost {
    console.log(`🔄 [Anthropic] Creating fallback post for ${platform.name}`);
    
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
      title = `${projectName}`;
      content = `${description}`;
      copyText = `${projectName}: ${description}`;
    }

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

  private isQuotaExceededError(error: any): boolean {
    if (error?.message?.includes('429')) return true;
    if (error?.message?.includes('quota')) return true;
    if (error?.message?.includes('exceeded')) return true;
    if (error?.message?.includes('rate limit')) return true;
    return false;
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

    let xCommunities = ['OpenSource Community', 'Programming Community'];
    let redditCommunities = ['r/programming', 'r/opensource'];

    if (projectType.includes('web') || language === 'javascript' || language === 'typescript') {
      xCommunities.push('WebDev Community', 'JavaScript Community', 'TypeScript Community');
      redditCommunities.push('r/webdev', 'r/javascript', 'r/typescript');
    } else if (language === 'python') {
      xCommunities.push('Python Community', 'AI Community', 'DataScience Community');
      redditCommunities.push('r/python', 'r/datascience', 'r/machinelearning');
    } else if (projectType.includes('mobile')) {
      xCommunities.push('Mobile Dev Community', 'React Community', 'JavaScript Community');
      redditCommunities.push('r/reactnative', 'r/flutter', 'r/mobile');
    } else {
      xCommunities.push('WebDev Community', 'GitHub Community', 'API Community');
      redditCommunities.push('r/webdev', 'r/github', 'r/coding');
    }

    return {
      x: xCommunities.slice(0, 5),
      reddit: redditCommunities.slice(0, 5)
    };
  }
}
