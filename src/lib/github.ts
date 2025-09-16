import axios from 'axios';
import type { GitHubProject } from '../types';

export class GitHubAnalyzer {
  private baseUrl = 'https://api.github.com/repos';

  async analyzeProject(repoUrl: string): Promise<GitHubProject> {
    try {
      // Nettoyer et valider l'URL
      let cleanUrl = repoUrl.trim();
      
      // Supprimer les protocoles multiples ou malformés
      cleanUrl = cleanUrl.replace(/^https?:\/\/https?:\/\//, 'https://');
      cleanUrl = cleanUrl.replace(/^https?:\/\/http:\/\//, 'https://');
      
      // Ajouter https:// si manquant
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      // Extraire owner/repo de l'URL
      const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
      if (!match) {
        throw new Error('Invalid GitHub URL. Expected format: https://github.com/owner/repo');
      }

      const [, owner, repo] = match;
      const cleanRepo = repo.replace('.git', '').replace(/\/$/, '');

      if (!owner || !cleanRepo) {
        throw new Error('Invalid GitHub URL. Please check the format.');
      }


      // Récupérer les informations du repository
      const [repoResponse, readmeResponse] = await Promise.all([
        axios.get(`${this.baseUrl}/${owner}/${cleanRepo}`),
        this.getReadme(owner, cleanRepo)
      ]);

      const repoData = repoResponse.data;
      

      // Analyser le type de projet
      const projectType = this.analyzeProjectType(repoData, readmeResponse);
      const keyFeatures = this.extractKeyFeatures(repoData, readmeResponse);
      
      // Analyser les technologies utilisées
      const technologies = this.detectTechnologies(repoData, readmeResponse);

      return {
        name: repoData.name,
        description: repoData.description || 'Aucune description disponible',
        url: repoData.html_url,
        language: technologies.length > 0 ? technologies.join(', ') : (repoData.language || 'Non spécifié'),
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        topics: repoData.topics || [],
        readme: readmeResponse,
        owner: {
          login: repoData.owner.login,
          avatar_url: repoData.owner.avatar_url
        },
        created_at: repoData.created_at,
        updated_at: repoData.updated_at,
        projectType,
        keyFeatures
      };
    } catch (error: any) {
      console.error('Erreur lors de l\'analyse du projet:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Projet GitHub non trouvé. Vérifiez que l\'URL est correcte et que le projet est public.');
      } else if (error.response?.status === 403) {
        throw new Error('Accès refusé. Le projet pourrait être privé ou l\'API GitHub est limitée.');
      } else if (error.message.includes('URL GitHub invalide')) {
        throw error;
      } else {
        throw new Error('Impossible d\'analyser le projet GitHub. Vérifiez votre connexion internet.');
      }
    }
  }

  private async getReadme(owner: string, repo: string): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/${owner}/${repo}/readme`);
      
      // Use atob() to decode base64 in browser
      const content = atob(response.data.content);
      
      
      // Clean markdown content for display
      let cleanContent = content
        .replace(/```[\s\S]*?```/g, '[Code block]') // Replace code blocks
        .replace(/#{1,6}\s/g, '') // Remove markdown headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
        .replace(/\n{3,}/g, '\n\n') // Reduce multiple line breaks
        .trim();
      
      // Limit to 1000 characters for display
      const finalContent = cleanContent.length > 1000 ? cleanContent.substring(0, 1000) + '...' : cleanContent;
      
      return finalContent;
    } catch (error) {
      console.error('Error fetching README:', error);
      return 'README not available';
    }
  }

  private analyzeProjectType(repoData: any, readme: string): string {
    const name = repoData.name.toLowerCase();
    const description = (repoData.description || '').toLowerCase();
    const readmeLower = readme.toLowerCase();
    const topics = (repoData.topics || []).map((t: string) => t.toLowerCase());
    
    // Détecter Tauri en priorité (plus spécifique)
    if (readmeLower.includes('tauri') || topics.includes('tauri') || description.includes('tauri')) {
      return 'Desktop App (Tauri)';
    }
    
    // Détecter Electron
    if (readmeLower.includes('electron') || topics.includes('electron') || description.includes('electron')) {
      return 'Desktop App (Electron)';
    }
    
    // Détecter les applications de point de vente/restaurant
    if (readmeLower.includes('pos') || readmeLower.includes('point of sale') || 
        readmeLower.includes('restaurant') || readmeLower.includes('café') ||
        description.includes('pos') || description.includes('restaurant')) {
      return 'POS/Restaurant App';
    }
    
    // Détecter les bots
    if (name.includes('bot') || description.includes('bot') || topics.includes('bot') || readmeLower.includes('bot')) {
      return 'Bot/Automation';
    }
    
    // Détecter les APIs (mais pas si c'est juste dans le nom sans contexte)
    if ((description.includes('api') || topics.includes('api') || readmeLower.includes('api')) && 
        !name.includes('api')) {
      return 'API/Backend';
    }
    
    // Détecter les applications mobiles
    if (readmeLower.includes('react native') || readmeLower.includes('flutter') || 
        readmeLower.includes('ionic') || topics.includes('mobile') || 
        description.includes('mobile app')) {
      return 'Mobile App';
    }
    
    // Détecter les applications web
    if (readmeLower.includes('react') || readmeLower.includes('vue') || readmeLower.includes('angular') ||
        readmeLower.includes('next.js') || readmeLower.includes('nuxt') || 
        topics.includes('web') || description.includes('web app')) {
      return 'Web Application';
    }
    
    // Détecter les CLI
    if (name.includes('cli') || description.includes('command line') || topics.includes('cli') || readmeLower.includes('cli')) {
      return 'CLI Tool';
    }
    
    // Détecter les jeux
    if (name.includes('game') || description.includes('game') || topics.includes('game') || readmeLower.includes('game')) {
      return 'Game';
    }
    
    // Détecter les bibliothèques
    if (name.includes('library') || description.includes('library') || topics.includes('library') || readmeLower.includes('library')) {
      return 'Library/Framework';
    }
    
    // Détecter les plugins
    if (name.includes('plugin') || description.includes('plugin') || topics.includes('plugin') || readmeLower.includes('plugin')) {
      return 'Plugin/Extension';
    }
    
    // Détecter les templates
    if (name.includes('template') || description.includes('template') || topics.includes('template') || readmeLower.includes('template')) {
      return 'Template/Boilerplate';
    }
    
    // Détecter les outils de données/ML
    if (name.includes('data') || description.includes('data') || topics.includes('data') || readmeLower.includes('data')) {
      return 'Data/ML Tool';
    }
    
    // Détecter les outils de développement
    if (name.includes('dev') || description.includes('developer') || topics.includes('developer-tools') || readmeLower.includes('developer')) {
      return 'Developer Tool';
    }
    
    return 'General Project';
  }

  private extractKeyFeatures(repoData: any, readme: string): string[] {
    const features: string[] = [];
    const description = repoData.description || '';
    const readmeLower = readme.toLowerCase();
    
    // Extraire les fonctionnalités clés
    if (description.includes('fast') || readmeLower.includes('fast') || readmeLower.includes('performance')) {
      features.push('High Performance');
    }
    if (description.includes('simple') || readmeLower.includes('simple') || readmeLower.includes('easy')) {
      features.push('Easy to Use');
    }
    if (description.includes('lightweight') || readmeLower.includes('lightweight')) {
      features.push('Lightweight');
    }
    if (description.includes('modern') || readmeLower.includes('modern')) {
      features.push('Modern');
    }
    if (description.includes('secure') || readmeLower.includes('secure') || readmeLower.includes('security')) {
      features.push('Secure');
    }
    if (description.includes('cross-platform') || readmeLower.includes('cross-platform')) {
      features.push('Cross-platform');
    }
    if (description.includes('real-time') || readmeLower.includes('real-time')) {
      features.push('Real-time');
    }
    if (description.includes('responsive') || readmeLower.includes('responsive')) {
      features.push('Responsive');
    }
    
    return features.slice(0, 3); // Limiter à 3 fonctionnalités principales
  }

  private detectTechnologies(repoData: any, readme: string): string[] {
    const technologies: string[] = [];
    const readmeLower = readme.toLowerCase();
    const topics = (repoData.topics || []).map((t: string) => t.toLowerCase());
    
    // Technologies frontend
    if (readmeLower.includes('react') || topics.includes('react')) technologies.push('React');
    if (readmeLower.includes('vue') || topics.includes('vue')) technologies.push('Vue.js');
    if (readmeLower.includes('angular') || topics.includes('angular')) technologies.push('Angular');
    if (readmeLower.includes('svelte') || topics.includes('svelte')) technologies.push('Svelte');
    if (readmeLower.includes('next.js') || readmeLower.includes('nextjs') || topics.includes('nextjs')) technologies.push('Next.js');
    if (readmeLower.includes('nuxt') || topics.includes('nuxt')) technologies.push('Nuxt.js');
    
    // Technologies backend
    if (readmeLower.includes('node.js') || readmeLower.includes('nodejs') || topics.includes('nodejs')) technologies.push('Node.js');
    if (readmeLower.includes('express') || topics.includes('express')) technologies.push('Express');
    if (readmeLower.includes('fastapi') || topics.includes('fastapi')) technologies.push('FastAPI');
    if (readmeLower.includes('django') || topics.includes('django')) technologies.push('Django');
    if (readmeLower.includes('flask') || topics.includes('flask')) technologies.push('Flask');
    if (readmeLower.includes('spring') || topics.includes('spring')) technologies.push('Spring');
    
    // Langages de programmation
    if (readmeLower.includes('typescript') || topics.includes('typescript')) technologies.push('TypeScript');
    if (readmeLower.includes('javascript') || topics.includes('javascript')) technologies.push('JavaScript');
    if (readmeLower.includes('python') || topics.includes('python')) technologies.push('Python');
    if (readmeLower.includes('rust') || topics.includes('rust')) technologies.push('Rust');
    if (readmeLower.includes('go') || readmeLower.includes('golang') || topics.includes('go')) technologies.push('Go');
    if (readmeLower.includes('java') || topics.includes('java')) technologies.push('Java');
    if (readmeLower.includes('c#') || readmeLower.includes('csharp') || topics.includes('csharp')) technologies.push('C#');
    if (readmeLower.includes('c++') || readmeLower.includes('cpp') || topics.includes('cpp')) technologies.push('C++');
    if (readmeLower.includes('swift') || topics.includes('swift')) technologies.push('Swift');
    if (readmeLower.includes('kotlin') || topics.includes('kotlin')) technologies.push('Kotlin');
    
    // Frameworks desktop
    if (readmeLower.includes('tauri') || topics.includes('tauri')) technologies.push('Tauri');
    if (readmeLower.includes('electron') || topics.includes('electron')) technologies.push('Electron');
    if (readmeLower.includes('flutter') || topics.includes('flutter')) technologies.push('Flutter');
    if (readmeLower.includes('react native') || topics.includes('react-native')) technologies.push('React Native');
    
    // Bases de données
    if (readmeLower.includes('postgresql') || readmeLower.includes('postgres') || topics.includes('postgresql')) technologies.push('PostgreSQL');
    if (readmeLower.includes('mysql') || topics.includes('mysql')) technologies.push('MySQL');
    if (readmeLower.includes('mongodb') || topics.includes('mongodb')) technologies.push('MongoDB');
    if (readmeLower.includes('redis') || topics.includes('redis')) technologies.push('Redis');
    if (readmeLower.includes('sqlite') || topics.includes('sqlite')) technologies.push('SQLite');
    
    // Outils et services
    if (readmeLower.includes('docker') || topics.includes('docker')) technologies.push('Docker');
    if (readmeLower.includes('kubernetes') || topics.includes('kubernetes')) technologies.push('Kubernetes');
    if (readmeLower.includes('aws') || topics.includes('aws')) technologies.push('AWS');
    if (readmeLower.includes('firebase') || topics.includes('firebase')) technologies.push('Firebase');
    if (readmeLower.includes('supabase') || topics.includes('supabase')) technologies.push('Supabase');
    
    // Supprimer les doublons et limiter à 5 technologies principales
    return [...new Set(technologies)].slice(0, 5);
  }
}
