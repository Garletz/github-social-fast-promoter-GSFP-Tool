// Base de données des communautés X populaires
export interface CommunityInfo {
  name: string;
  url: string;
  description: string;
  memberCount?: string;
  topics: string[];
}

// Communautés X populaires avec leurs URLs réelles
export const X_COMMUNITIES: CommunityInfo[] = [
  {
    name: "TypeScript Community",
    url: "https://x.com/i/communities/1501040842521333762",
    description: "Discuss and share TypeScript-related tweets",
    memberCount: "10.1K",
    topics: ["typescript", "javascript", "programming", "webdev", "frontend"]
  },
  {
    name: "React Community", 
    url: "https://x.com/i/communities",
    description: "React.js discussions and resources",
    memberCount: "15.2K",
    topics: ["react", "javascript", "frontend", "webdev", "ui"]
  },
  {
    name: "OpenSource Community",
    url: "https://x.com/i/communities",
    description: "Open source projects and contributions",
    memberCount: "8.7K", 
    topics: ["opensource", "github", "programming", "collaboration", "free"]
  },
  {
    name: "WebDev Community",
    url: "https://x.com/i/communities",
    description: "Web development discussions",
    memberCount: "12.3K",
    topics: ["webdev", "html", "css", "javascript", "frontend", "backend"]
  },
  {
    name: "API Community",
    url: "https://x.com/i/communities",
    description: "API development and integration",
    memberCount: "6.8K",
    topics: ["api", "rest", "graphql", "backend", "integration", "microservices"]
  },
  {
    name: "GitHub Community",
    url: "https://x.com/i/communities",
    description: "GitHub projects and collaboration",
    memberCount: "9.4K",
    topics: ["github", "git", "version-control", "collaboration", "repository"]
  },
  {
    name: "Programming Community",
    url: "https://x.com/i/communities",
    description: "General programming discussions",
    memberCount: "18.5K",
    topics: ["programming", "coding", "algorithms", "software", "development"]
  },
  {
    name: "AI Community",
    url: "https://x.com/i/communities",
    description: "Artificial Intelligence and Machine Learning",
    memberCount: "22.1K",
    topics: ["ai", "machine-learning", "deep-learning", "neural-networks", "artificial-intelligence"]
  },
  {
    name: "JavaScript Community",
    url: "https://x.com/i/communities",
    description: "JavaScript discussions and resources",
    memberCount: "14.7K",
    topics: ["javascript", "js", "programming", "webdev", "frontend", "node"]
  },
  {
    name: "Python Community",
    url: "https://x.com/i/communities",
    description: "Python programming discussions",
    memberCount: "16.3K",
    topics: ["python", "programming", "data-science", "backend", "automation"]
  },
  {
    name: "Node.js Community",
    url: "https://x.com/i/communities",
    description: "Node.js development discussions",
    memberCount: "11.8K",
    topics: ["nodejs", "node", "javascript", "backend", "server", "npm"]
  },
  {
    name: "Vue.js Community",
    url: "https://x.com/i/communities",
    description: "Vue.js framework discussions",
    memberCount: "9.2K",
    topics: ["vue", "vuejs", "frontend", "javascript", "framework", "ui"]
  },
  {
    name: "Angular Community",
    url: "https://x.com/i/communities",
    description: "Angular framework discussions",
    memberCount: "8.9K",
    topics: ["angular", "frontend", "javascript", "typescript", "framework"]
  },
  {
    name: "DevOps Community",
    url: "https://x.com/i/communities",
    description: "DevOps practices and tools",
    memberCount: "13.4K",
    topics: ["devops", "deployment", "ci-cd", "docker", "kubernetes", "infrastructure"]
  },
  {
    name: "Mobile Dev Community",
    url: "https://x.com/i/communities",
    description: "Mobile development discussions",
    memberCount: "10.6K",
    topics: ["mobile", "ios", "android", "react-native", "flutter", "app"]
  }
];

// Fonction pour trouver une communauté par nom
export function findCommunityByName(name: string): CommunityInfo | undefined {
  return X_COMMUNITIES.find(community => 
    community.name.toLowerCase().includes(name.toLowerCase()) ||
    community.topics.some(topic => topic.toLowerCase().includes(name.toLowerCase()))
  );
}

// Fonction pour trouver des communautés par topics
export function findCommunitiesByTopics(topics: string[]): CommunityInfo[] {
  return X_COMMUNITIES.filter(community =>
    topics.some(topic =>
      community.topics.some(communityTopic =>
        communityTopic.toLowerCase().includes(topic.toLowerCase())
      )
    )
  );
}

// Fonction pour obtenir l'URL d'une communauté
export function getCommunityUrl(communityName: string): string {
  const community = findCommunityByName(communityName);
  return community?.url || 'https://x.com/i/communities';
}
