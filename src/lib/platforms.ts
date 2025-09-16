import type { PlatformConfig } from '../types';
import { getCommunityUrl } from './communities-db';

// Fonction pour obtenir l'URL correcte selon la plateforme
export function getPlatformUrl(platformName: string): string {
  // Communautés X - utiliser l'URL spécifique de la communauté
  if (platformName.startsWith('X - ')) {
    const communityName = platformName.replace('X - ', '');
    return getCommunityUrl(communityName);
  }
  
  // Communautés Reddit - utiliser l'URL du subreddit
  if (platformName.startsWith('Reddit - ')) {
    const subreddit = platformName.replace('Reddit - ', '');
    return `https://reddit.com/${subreddit}`;
  }
  
  // Plateformes principales - utiliser l'URL configurée
  const platform = PLATFORMS.find(p => p.name === platformName);
  return platform?.url || '#';
}

// Fonction pour créer des plateformes communautaires
export function createCommunityPlatforms(communities: {x: string[], reddit: string[]}): PlatformConfig[] {
  const communityPlatforms: PlatformConfig[] = [];

  // Communautés X
  communities.x.forEach(community => {
    communityPlatforms.push({
      name: `X - ${community}`,
      maxCharacters: 280,
      hashtagLimit: 3,
      url: `https://x.com/i/communities`, // URL générale des communautés X
      categories: ['Social Media', 'Community'],
      rules: [
        'Maximum 280 caractères',
        'Poster dans la communauté spécifique',
        'Respecter les règles de la communauté',
        'Contenu pertinent à la communauté',
        'Pas de hashtags - mots-clés naturels',
        'Pas d\'emojis - contenu professionnel'
      ],
      isCommunity: true,
      parentPlatform: 'Twitter/X'
    });
  });

  // Communautés Reddit
  communities.reddit.forEach(community => {
    communityPlatforms.push({
      name: `Reddit - ${community}`,
      maxCharacters: 10000,
      hashtagLimit: 0,
      url: `https://reddit.com/${community}`,
      categories: ['Social Media', 'Community'],
      rules: [
        'Maximum 10000 caractères',
        'Pas de hashtags',
        'Titre descriptif',
        'Contenu informatif'
      ],
      isCommunity: true,
      parentPlatform: 'Reddit'
    });
  });

  return communityPlatforms;
}

export const PLATFORMS: PlatformConfig[] = [
  // Réseaux sociaux principaux - Twitter/X en position 1
  {
    name: 'Twitter/X',
    maxCharacters: 280,
    hashtagLimit: 0,
    url: 'https://twitter.com/compose/tweet',
    categories: ['Social Media', 'Tech', 'Open Source', 'Programming'],
    rules: [
      'Maximum 280 caractères',
      'Pas de hashtags - utiliser des mots-clés naturels',
      'Pas d\'emojis - contenu professionnel',
      'Contenu direct et informatif'
    ]
  },
  // Reddit en position 2
  {
    name: 'Reddit',
    maxCharacters: 10000,
    hashtagLimit: 0,
    url: 'https://www.reddit.com/',
    categories: ['Community', 'Tech', 'Programming', 'Open Source'],
    rules: [
      'Ton informatif et détaillé',
      'Maximum 10000 caractères',
      'Pas de hashtags',
      'Inclure des détails techniques'
    ]
  },
  {
    name: 'LinkedIn',
    maxCharacters: 3000,
    hashtagLimit: 0,
    url: 'https://www.linkedin.com/feed/',
    categories: ['Professional', 'Tech', 'Career', 'Innovation'],
    rules: [
      'Ton professionnel et informatif',
      'Maximum 3000 caractères',
      'Inclure des insights techniques',
      'Pas de hashtags - contenu naturel'
    ]
  },
  {
    name: 'Facebook',
    maxCharacters: 63206,
    hashtagLimit: 0,
    url: 'https://www.facebook.com/',
    categories: ['Social Media', 'Tech', 'Programming', 'Open Source'],
    rules: [
      'Ton convivial et informatif',
      'Maximum 63206 caractères',
      'Inclure des visuels si possible',
      'Pas de hashtags - contenu naturel'
    ]
  },
  {
    name: 'Instagram',
    maxCharacters: 2200,
    hashtagLimit: 0,
    url: 'https://www.instagram.com/',
    categories: ['Social Media', 'Tech', 'Programming', 'Design'],
    rules: [
      'Ton visuel et informatif',
      'Maximum 2200 caractères',
      'Pas de hashtags - contenu naturel',
      'Pas d\'emojis - contenu professionnel'
    ]
  },

  // Plateformes de lancement de produits
  {
    name: 'Product Hunt',
    maxCharacters: 500,
    hashtagLimit: 3,
    url: 'https://www.producthunt.com/',
    categories: ['Product Launch', 'Startup', 'Innovation', 'Tech'],
    rules: [
      'Focus sur la valeur produit',
      'Maximum 500 caractères',
      'Inclure un call-to-action clair',
      'Mentionner les fonctionnalités clés'
    ]
  },
  {
    name: 'OpenHunts',
    maxCharacters: 800,
    hashtagLimit: 0,
    url: 'https://openhunts.com/',
    categories: ['Product Launch', 'Makers', 'Startup', 'Tech'],
    rules: [
      'Ton authentique et maker-focused',
      'Maximum 800 caractères',
      'Pas de hashtags - mots-clés naturels',
      'Focus sur la communauté des makers'
    ]
  },
  {
    name: 'Indie Hackers',
    maxCharacters: 1000,
    hashtagLimit: 0,
    url: 'https://www.indiehackers.com/',
    categories: ['Community', 'Startup', 'Entrepreneurship', 'Tech'],
    rules: [
      'Ton transparent et entrepreneurial',
      'Maximum 1000 caractères',
      'Pas de hashtags',
      'Partager l\'histoire et les défis'
    ]
  },
  {
    name: 'BetaList',
    maxCharacters: 600,
    hashtagLimit: 0,
    url: 'https://betalist.com/',
    categories: ['Launch Platform', 'Beta Testing', 'Startup', 'Early Access'],
    rules: [
      'Ton early-adopter friendly',
      'Maximum 600 caractères',
      'Pas de hashtags',
      'Focus sur l\'innovation et l\'accès anticipé'
    ]
  },
  {
    name: 'Hacker News',
    maxCharacters: 2000,
    hashtagLimit: 0,
    url: 'https://news.ycombinator.com/',
    categories: ['Tech Community', 'Programming', 'Startup', 'Innovation'],
    rules: [
      'Ton technique et informatif',
      'Maximum 2000 caractères',
      'Pas de hashtags',
      'Contenu de qualité et discussions'
    ]
  },
  {
    name: 'Dev.to',
    maxCharacters: 1000,
    hashtagLimit: 4,
    url: 'https://dev.to/',
    categories: ['Developer Community', 'Tech', 'Programming', 'Tutorials'],
    rules: [
      'Ton éducatif et technique',
      'Maximum 1000 caractères',
      'Maximum 4 hashtags',
      'Contenu utile pour développeurs'
    ]
  },
  {
    name: 'Makerlog',
    maxCharacters: 500,
    hashtagLimit: 0,
    url: 'https://makerlog.co/',
    categories: ['Productivity', 'Makers', 'Startup', 'Progress Tracking'],
    rules: [
      'Ton progress-focused',
      'Maximum 500 caractères',
      'Pas de hashtags',
      'Focus sur les accomplissements quotidiens'
    ]
  },
  {
    name: 'StartupLift',
    maxCharacters: 600,
    hashtagLimit: 0,
    url: 'https://startuplift.com/',
    categories: ['Launch Platform', 'Startup', 'Tech', 'Innovation'],
    rules: [
      'Ton professionnel et innovant',
      'Maximum 600 caractères',
      'Pas de hashtags',
      'Focus sur les nouvelles technologies'
    ]
  },
  {
    name: 'FounderKit',
    maxCharacters: 700,
    hashtagLimit: 0,
    url: 'https://founderkit.com/',
    categories: ['Community', 'Startup', 'Entrepreneurship', 'Resources'],
    rules: [
      'Ton entrepreneurial et resourceful',
      'Maximum 700 caractères',
      'Pas de hashtags',
      'Focus sur les outils et ressources'
    ]
  },
  {
    name: 'Peerlist',
    maxCharacters: 600,
    hashtagLimit: 4,
    url: 'https://peerlist.io/',
    categories: ['Product Launch', 'Professional', 'Tech'],
    rules: [
      'Ton professionnel',
      'Maximum 600 caractères',
      'Focus sur les compétences',
      'Inclure des métriques'
    ]
  },
  {
    name: 'Launching Next',
    maxCharacters: 500,
    hashtagLimit: 3,
    url: 'https://launchingnext.com/',
    categories: ['Product Launch', 'Startup', 'Innovation'],
    rules: [
      'Focus sur l\'innovation',
      'Maximum 500 caractères',
      'Mentionner le marché cible',
      'Inclure des bénéfices utilisateur'
    ]
  },
  {
    name: 'Betapage',
    maxCharacters: 500,
    hashtagLimit: 3,
    url: 'https://betapage.co/',
    categories: ['Product Launch', 'Beta', 'Tech'],
    rules: [
      'Focus sur les tests beta',
      'Maximum 500 caractères',
      'Mentionner les retours utilisateurs',
      'Inclure des captures d\'écran'
    ]
  },
  {
    name: 'Uneed',
    maxCharacters: 400,
    hashtagLimit: 2,
    url: 'https://uneed.best/',
    categories: ['Product Launch', 'Tools', 'Tech'],
    rules: [
      'Focus sur l\'utilité',
      'Maximum 400 caractères',
      'Mentionner les cas d\'usage',
      'Inclure des exemples concrets'
    ]
  },
  {
    name: 'TinyLaunch',
    maxCharacters: 300,
    hashtagLimit: 2,
    url: 'https://tinylaunch.com/',
    categories: ['Product Launch', 'Minimal', 'Tech'],
    rules: [
      'Messages courts et percutants',
      'Maximum 300 caractères',
      'Focus sur l\'essentiel',
      'Inclure un lien direct'
    ]
  },
  {
    name: 'MicroLaunch',
    maxCharacters: 350,
    hashtagLimit: 2,
    url: 'https://microlaunch.net/',
    categories: ['Product Launch', 'Micro', 'Tech'],
    rules: [
      'Messages micro mais impactants',
      'Maximum 350 caractères',
      'Focus sur la simplicité',
      'Inclure des métriques clés'
    ]
  },
  {
    name: 'Fazier',
    maxCharacters: 500,
    hashtagLimit: 3,
    url: 'https://fazier.com/',
    categories: ['Product Launch', 'Innovation', 'Tech'],
    rules: [
      'Focus sur l\'innovation',
      'Maximum 500 caractères',
      'Mentionner les technologies utilisées',
      'Inclure des bénéfices uniques'
    ]
  },
  {
    name: 'SideProjectors',
    maxCharacters: 600,
    hashtagLimit: 4,
    url: 'https://sideprojectors.com/',
    categories: ['Product Launch', 'Side Project', 'Indie'],
    rules: [
      'Focus sur les projets personnels',
      'Maximum 600 caractères',
      'Mentionner le temps de développement',
      'Inclure des défis rencontrés'
    ]
  },
  {
    name: 'PromoteProject',
    maxCharacters: 500,
    hashtagLimit: 3,
    url: 'https://promoteproject.com/',
    categories: ['Product Launch', 'Promotion', 'Tech'],
    rules: [
      'Focus sur la promotion',
      'Maximum 500 caractères',
      'Mentionner les canaux de distribution',
      'Inclure des métriques de traction'
    ]
  },
  {
    name: 'Launching Today',
    maxCharacters: 400,
    hashtagLimit: 2,
    url: 'https://launchingtoday.com/',
    categories: ['Product Launch', 'Daily', 'Tech'],
    rules: [
      'Focus sur le lancement du jour',
      'Maximum 400 caractères',
      'Mentionner la date de lancement',
      'Inclure des détails exclusifs'
    ]
  },
  {
    name: 'Resource.fyi',
    maxCharacters: 500,
    hashtagLimit: 3,
    url: 'https://resource.fyi/',
    categories: ['Product Launch', 'Resources', 'Tools'],
    rules: [
      'Focus sur les ressources',
      'Maximum 500 caractères',
      'Mentionner les outils utilisés',
      'Inclure des liens utiles'
    ]
  },
  {
    name: 'ProductBurst',
    maxCharacters: 500,
    hashtagLimit: 3,
    url: 'https://productburst.com/',
    categories: ['Product Launch', 'Burst', 'Tech'],
    rules: [
      'Focus sur l\'impact',
      'Maximum 500 caractères',
      'Mentionner les résultats rapides',
      'Inclure des témoignages'
    ]
  },
  {
    name: 'Huzzler - Launch Arena',
    maxCharacters: 500,
    hashtagLimit: 3,
    url: 'https://huzzler.com/',
    categories: ['Product Launch', 'Arena', 'Competition'],
    rules: [
      'Focus sur la compétition',
      'Maximum 500 caractères',
      'Mentionner les défis relevés',
      'Inclure des métriques de performance'
    ]
  },

  // Plateformes de découverte et curation
  {
    name: 'Startup Stash',
    maxCharacters: 600,
    hashtagLimit: 4,
    url: 'https://startupstash.com/',
    categories: ['Startup', 'Resources', 'Tools'],
    rules: [
      'Focus sur les ressources startup',
      'Maximum 600 caractères',
      'Mentionner les catégories d\'outils',
      'Inclure des alternatives'
    ]
  },
  {
    name: 'Startupranking',
    maxCharacters: 500,
    hashtagLimit: 3,
    url: 'https://startupranking.com/',
    categories: ['Startup', 'Ranking', 'Analytics'],
    rules: [
      'Focus sur le classement',
      'Maximum 500 caractères',
      'Mentionner la position',
      'Inclure des métriques de croissance'
    ]
  },
  {
    name: 'LibHunt',
    maxCharacters: 600,
    hashtagLimit: 4,
    url: 'https://www.libhunt.com/',
    categories: ['Open Source', 'Libraries', 'Tools'],
    rules: [
      'Focus sur les bibliothèques',
      'Maximum 600 caractères',
      'Mentionner les alternatives',
      'Inclure des métriques d\'usage'
    ]
  },
  {
    name: 'Open Source Agenda',
    maxCharacters: 500,
    hashtagLimit: 3,
    url: 'https://opensourceagenda.com/',
    categories: ['Open Source', 'Agenda', 'Events'],
    rules: [
      'Focus sur l\'open source',
      'Maximum 500 caractères',
      'Mentionner les événements',
      'Inclure des dates importantes'
    ]
  },
  {
    name: 'OSS Directory',
    maxCharacters: 600,
    hashtagLimit: 4,
    url: 'https://ossdirectory.com/',
    categories: ['Open Source', 'Directory', 'Projects'],
    rules: [
      'Focus sur le répertoire OSS',
      'Maximum 600 caractères',
      'Mentionner les catégories',
      'Inclure des liens de documentation'
    ]
  },
  {
    name: 'GitHub Trending',
    maxCharacters: 500,
    hashtagLimit: 3,
    url: 'https://github.com/trending',
    categories: ['Open Source', 'GitHub', 'Trending'],
    rules: [
      'Focus sur les tendances',
      'Maximum 500 caractères',
      'Mentionner la popularité',
      'Inclure des métriques GitHub'
    ]
  },
  {
    name: 'Awesome Lists',
    maxCharacters: 600,
    hashtagLimit: 4,
    url: 'https://github.com/sindresorhus/awesome',
    categories: ['Open Source', 'Awesome', 'Curated'],
    rules: [
      'Focus sur la curation',
      'Maximum 600 caractères',
      'Mentionner la qualité',
      'Inclure des critères d\'inclusion'
    ]
  },
  {
    name: 'StackShare',
    maxCharacters: 500,
    hashtagLimit: 3,
    url: 'https://stackshare.io/',
    categories: ['Tech Stack', 'Tools', 'Comparison'],
    rules: [
      'Focus sur la stack technique',
      'Maximum 500 caractères',
      'Mentionner les technologies',
      'Inclure des comparaisons'
    ]
  },
  {
    name: 'AlternativeTo',
    maxCharacters: 600,
    hashtagLimit: 4,
    url: 'https://alternativeto.net/',
    categories: ['Alternatives', 'Tools', 'Comparison'],
    rules: [
      'Focus sur les alternatives',
      'Maximum 600 caractères',
      'Mentionner les différences',
      'Inclure des avantages/inconvénients'
    ]
  },
  {
    name: 'Crunchbase',
    maxCharacters: 1000,
    hashtagLimit: 5,
    url: 'https://www.crunchbase.com/',
    categories: ['Business', 'Funding', 'Company'],
    rules: [
      'Ton business et professionnel',
      'Maximum 1000 caractères',
      'Mentionner le financement',
      'Inclure des métriques business'
    ]
  },
  {
    name: 'AngelList',
    maxCharacters: 800,
    hashtagLimit: 4,
    url: 'https://angel.co/',
    categories: ['Startup', 'Funding', 'Investors'],
    rules: [
      'Focus sur l\'investissement',
      'Maximum 800 caractères',
      'Mentionner les investisseurs',
      'Inclure des métriques de croissance'
    ]
  },

];

export function getPlatformsByCategory(category: string): PlatformConfig[] {
  return PLATFORMS.filter(platform => 
    platform.categories.some(cat => 
      cat.toLowerCase().includes(category.toLowerCase())
    )
  );
}

export function getPlatformByName(name: string): PlatformConfig | undefined {
  return PLATFORMS.find(platform => 
    platform.name.toLowerCase() === name.toLowerCase()
  );
}
