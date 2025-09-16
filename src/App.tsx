import { useState } from 'react';
import { APIFactory } from './lib/api-factory';
import { PLATFORMS, createCommunityPlatforms } from './lib/platforms';
import { GitHubAnalyzer } from './lib/github';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { EditablePost } from './components/EditablePost';
import { ProjectInfoForm } from './components/ProjectInfoForm';
import { ProjectTagsEditor } from './components/ProjectTagsEditor';
import { useSession } from './hooks/useSession';
import { Loader2, Github, Check, X, Star, GitFork, RotateCcw, Search, Settings, AlertTriangle, Trash2 } from 'lucide-react';

// Main platforms always visible
const MAIN_PLATFORMS = [
  'Twitter/X', 'LinkedIn', 'Reddit', 'Dev.to', 'Hacker News - Show HN', 
  'Product Hunt', 'Indie Hackers', 'GitHub Trending'
];

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [modificationInstruction, setModificationInstruction] = useState('');
  const [modifying, setModifying] = useState(false);
  const [searchingCommunities, setSearchingCommunities] = useState(false);
  const [communityPlatforms, setCommunityPlatforms] = useState<any[]>([]);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeys, setApiKeys] = useState(() => {
    return {
      gemini: localStorage.getItem('apiKey_gemini') || '',
      openai: localStorage.getItem('apiKey_openai') || '',
      anthropic: localStorage.getItem('apiKey_anthropic') || ''
    };
  });
  const [apiProvider, setApiProvider] = useState(() => {
    return localStorage.getItem('apiProvider') || 'gemini';
  });
  const [quotaWarning, setQuotaWarning] = useState('');
  const [activeTab, setActiveTab] = useState('gemini'); // Active tab in modal

  // Function to get current API key
  const getCurrentApiKey = () => {
    return apiKeys[apiProvider as keyof typeof apiKeys] || '';
  };

  // Function to update a specific API key with auto-save
  const updateApiKey = (provider: string, key: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: key
    }));
    // Immediate auto-save to localStorage
    localStorage.setItem(`apiKey_${provider}`, key);
  };

  // Function to remove an API key
  const removeApiKey = (provider: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: ''
    }));
    // Remove from localStorage
    localStorage.removeItem(`apiKey_${provider}`);
  };

  // Use session hook
  const {
    project,
    posts,
    selectedPlatforms,
    saveProject,
    savePosts,
    saveSelectedPlatforms,
    updatePost,
    resetSession
  } = useSession();

  const validateGitHubUrl = (url: string): boolean => {
    const githubRegex = /^https?:\/\/github\.com\/[^\/]+\/[^\/\?#]+/;
    return githubRegex.test(url.trim());
  };

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('GitHub URL required');
      return;
    }

    if (!validateGitHubUrl(url)) {
      setError('Invalid GitHub URL. Format: https://github.com/owner/repo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const analyzer = new GitHubAnalyzer();
      const analyzedProject = await analyzer.analyzeProject(url);
        saveProject(analyzedProject);
        
        // Auto-select main platforms
        saveSelectedPlatforms(MAIN_PLATFORMS);
    } catch (err: any) {
      setError(err.message || 'Error analyzing project');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePosts = async () => {
    if (!project || selectedPlatforms.length === 0) return;

    setGenerating(true);
    setError('');

    try {
      const allPlatforms = [...PLATFORMS, ...communityPlatforms];
      const platforms = allPlatforms.filter(platform => 
        selectedPlatforms.includes(platform.name)
      );
      
      const currentApiKey = getCurrentApiKey();
          if (!currentApiKey) {
        setError('❌ API key not configured. Open settings to configure your API key.');
        return;
      }
      
      // Reset warnings
      setQuotaWarning('');
      setError('');
      
      const generator = APIFactory.createGenerator(apiProvider, currentApiKey);
      const generatedPosts = await generator.generateSocialPosts(project, platforms, customInstructions);
      savePosts(generatedPosts);
    } catch (err: any) {
      console.error('Error generating posts:', err);
      
        // More informative error messages
        if (err.message?.includes('429') || err.message?.includes('quota')) {
          setQuotaWarning('⚠️ API quota exceeded! Fallback posts have been generated. Change API provider or wait until tomorrow.');
          setError('');
        } else if (err.message?.includes('API key')) {
          setError('❌ Invalid API key. Check your configuration in settings.');
        } else {
          setError(`❌ Error during generation: ${err.message || 'Please try again.'}`);
        }
    } finally {
      setGenerating(false);
    }
  };

  const togglePlatform = (platformName: string) => {
    const newPlatforms = selectedPlatforms.includes(platformName)
      ? selectedPlatforms.filter(name => name !== platformName)
      : [...selectedPlatforms, platformName];
    saveSelectedPlatforms(newPlatforms);
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Erreur copie:', err);
    }
  };

  const handleUpdateProjectTags = (updates: { projectType: string; technologies: string; keyFeatures: string[] }) => {
    if (project) {
      const updatedProject = {
        ...project,
        projectType: updates.projectType,
        language: updates.technologies,
        keyFeatures: updates.keyFeatures
      };
      saveProject(updatedProject);
    }
  };


  const handleModifyPosts = async () => {
    if (!project || posts.length === 0 || !modificationInstruction.trim()) return;

    setModifying(true);
    setError('');

    try {
      const currentApiKey = getCurrentApiKey();
          if (!currentApiKey) {
        setError('❌ API key not configured. Open settings to configure your API key.');
        return;
      }
      
      const generator = APIFactory.createGenerator(apiProvider, currentApiKey);
      const modifiedPosts = await generator.modifySocialPosts(project, posts, modificationInstruction);
      savePosts(modifiedPosts);
      setModificationInstruction(''); // Clear the instruction after successful modification
    } catch (err: any) {
      console.error('Error modifying posts:', err);
      setError(`Error modifying posts: ${err.message || 'Please try again.'}`);
    } finally {
      setModifying(false);
    }
  };

  const handleSearchCommunities = async () => {
    if (!project) return;

    setSearchingCommunities(true);
    setError('');

    try {
      const currentApiKey = getCurrentApiKey();
          if (!currentApiKey) {
        setError('❌ API key not configured. Open settings to configure your API key.');
        return;
      }
      
      const generator = APIFactory.createGenerator(apiProvider, currentApiKey);
      const communities = await generator.findRelevantCommunities(project);
      
      // Create community platforms
      const newCommunityPlatforms = createCommunityPlatforms(communities);
      setCommunityPlatforms(newCommunityPlatforms);
      
      // Auto-select first 3 of each
      const autoSelected = [
        ...newCommunityPlatforms.slice(0, 3), // First 3 X
        ...newCommunityPlatforms.slice(5, 8)  // First 3 Reddit
      ].map(p => p.name);
      
      const currentPlatforms = selectedPlatforms;
      const newPlatforms = [...currentPlatforms, ...autoSelected];
      saveSelectedPlatforms(newPlatforms);
      
      console.log('Communities found and added:', newCommunityPlatforms.length);
    } catch (err: any) {
      console.error('Error searching communities:', err);
      setError(`Error searching communities: ${err.message || 'Please try again.'}`);
    } finally {
      setSearchingCommunities(false);
    }
  };

  const resetApp = () => {
    setUrl('');
    resetSession();
    setError('');
    setModificationInstruction('');
    setCommunityPlatforms([]);
  };

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <div className="h-full flex flex-col">
        
        {/* Header compact - URL GitHub */}
        <div className="bg-white border-b p-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🦅</span>
              <span className="text-sm font-semibold text-gray-700">GSFP Tool</span>
            </div>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            <Github className="h-4 w-4 text-gray-600" />
            <Input
              type="url"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="flex-1 h-8 text-xs"
            />
                <Button 
                  onClick={handleAnalyze} 
                  disabled={loading || !url.trim()}
                  size="sm"
                  className="h-10 px-4 text-sm"
                >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                'Analyze'
              )}
            </Button>
                <Button 
                  onClick={() => setShowSettings(true)} 
                  variant="outline" 
                  size="sm" 
                  className="h-10 px-3 text-sm relative"
                  title={`API Settings - ${apiProvider.toUpperCase()}`}
                >
                  <Settings className="h-4 w-4" />
                  {getCurrentApiKey() && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </Button>
                {(project || posts.length > 0) && (
                  <Button onClick={resetApp} variant="outline" size="sm" className="h-10 px-3 text-sm">
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset Session
                  </Button>
                )}
          </div>
          {error && (
            <div className="text-red-600 text-xs mt-1">{error}</div>
          )}
          {quotaWarning && (
            <div className="bg-orange-100 border border-orange-300 rounded p-2 mt-2">
              <div className="text-orange-800 text-xs flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                <div>
                    <div className="font-medium">API Quota Exceeded!</div>
                    <div className="mt-1">{quotaWarning}</div>
                    <div className="mt-2">
                      <Button 
                        onClick={() => setShowSettings(true)} 
                        size="sm" 
                        variant="outline"
                        className="h-6 px-2 text-xs border-orange-300 text-orange-700 hover:bg-orange-200"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Change API Key
                      </Button>
                    </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content - Grid Layout */}
        <div className="flex-1 grid grid-cols-12 gap-2 p-2">
          
          {/* Colonne 1-3: Projet GitHub */}
          <div className="col-span-3 bg-white rounded border p-2">
            {project ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <img 
                    src={project.owner.avatar_url} 
                    alt={project.owner.login}
                    className="w-6 h-6 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{project.name}</div>
                    <div className="text-xs text-gray-500 truncate">by {project.owner.login}</div>
                  </div>
                </div>
                
                <p className="text-xs text-gray-700 line-clamp-2">{project.description}</p>
                
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    <span>{project.stars.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GitFork className="h-3 w-3" />
                    <span>{project.forks.toLocaleString()}</span>
                  </div>
                </div>

                {/* Project tags editor */}
                <div className="mt-3">
                  <ProjectTagsEditor
                    projectType={project.projectType}
                    technologies={project.language}
                    keyFeatures={project.keyFeatures}
                    onUpdate={handleUpdateProjectTags}
                  />
                </div>

                    {project.readme && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-gray-600 mb-1">README:</div>
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded max-h-24 overflow-y-auto">
                          {project.readme}
                        </div>
                      </div>
                    )}

                    {/* Search Communities Button */}
                    <div className="mt-2">
                      <Button
                        onClick={handleSearchCommunities}
                        disabled={searchingCommunities}
                        size="sm"
                        className="w-full h-8 text-xs"
                      >
                        {searchingCommunities ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="mr-1 h-3 w-3" />
                            Find Target Communities
                          </>
                        )}
                      </Button>
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        Find relevant X & Reddit communities based on your project analysis
                      </div>
                    </div>

                    {/* Project Information for Launch Platforms */}
                    <div className="mt-2">
                      <ProjectInfoForm />
                    </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 text-xs py-8">
                Enter a GitHub URL to analyze the project
              </div>
            )}
          </div>

          {/* Column 4-6: Platforms */}
          <div className="col-span-3 bg-white rounded border p-2">
            <div className="text-xs font-medium mb-2">Platforms ({selectedPlatforms.length})</div>
            
            <div className="space-y-1 max-h-[calc(100vh-350px)] overflow-y-auto">
              {PLATFORMS.map((platform) => {
                // Find communities associated with this platform
                const relatedCommunities = communityPlatforms.filter(
                  cp => cp.parentPlatform === platform.name
                );

                return (
                  <div key={platform.name}>
                    {/* Plateforme principale */}
                    <div
                      className={`p-1 border rounded cursor-pointer transition-colors text-xs ${
                        selectedPlatforms.includes(platform.name)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => togglePlatform(platform.name)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{platform.name}</div>
                          <div className="text-gray-500">
                            {platform.maxCharacters}ch • {platform.hashtagLimit}h
                          </div>
                        </div>
                        {selectedPlatforms.includes(platform.name) ? (
                          <Check className="h-3 w-3 text-blue-600 flex-shrink-0" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>

                    {/* Communautés associées */}
                    {relatedCommunities.length > 0 && (
                      <div className="ml-4 mt-1 space-y-1">
                        {relatedCommunities.map((community) => (
                          <div
                            key={community.name}
                            className={`p-1 border rounded cursor-pointer transition-colors text-xs ${
                              selectedPlatforms.includes(community.name)
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => togglePlatform(community.name)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-green-700">
                                  {community.name.replace(`${platform.name} - `, '')}
                                </div>
                                <div className="text-gray-500">
                                  {community.maxCharacters}ch • {community.hashtagLimit}h
                                </div>
                              </div>
                              {selectedPlatforms.includes(community.name) ? (
                                <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                              ) : (
                                <X className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {project && (
              <Button 
                onClick={handleGeneratePosts}
                disabled={selectedPlatforms.length === 0 || generating}
                className="w-full mt-2 h-12 text-sm font-medium"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Generating...
                  </>
                ) : (
                  `Generate (${selectedPlatforms.length})`
                )}
              </Button>
            )}
            
            {/* Custom instructions for generation */}
            {selectedPlatforms.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-medium text-gray-600 mb-1">Custom instructions (optional)</div>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Ex: Focus on technical features, use a more formal tone, mention performance..."
                  className="w-full text-xs p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
                <div className="text-xs text-gray-500 mt-1">
                  These instructions will be added to the generation prompt to customize the content
                </div>
              </div>
            )}
          </div>

          {/* Column 7-12: Generated Posts */}
          <div className="col-span-6 bg-white rounded border p-2">
            <div className="text-xs font-medium mb-2">
              Generated Posts ({posts.length})
            </div>
            
            <div className="grid grid-cols-2 gap-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {posts.map((post, index) => (
                <EditablePost
                  key={post.id || index}
                  post={post}
                  onUpdate={updatePost}
                  onCopy={(text) => copyToClipboard(text, index)}
                  onOpenUrl={(url) => window.open(url, '_blank')}
                  copied={copiedIndex === index}
                />
              ))}
            </div>

            {posts.length === 0 && project && (
              <div className="text-center text-gray-500 text-xs py-8">
                Select platforms and click "Generate"
              </div>
            )}

            {/* Modification chat */}
            {posts.length > 0 && (
              <div className="mt-2 border-t pt-2">
                <div className="text-xs font-medium text-gray-600 mb-1">Modify posts:</div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Ex: change the tone, highlight TypeScript, add more emojis..."
                    value={modificationInstruction}
                    onChange={(e) => setModificationInstruction(e.target.value)}
                    disabled={modifying}
                    className="flex-1 h-7 text-xs"
                  />
                  <Button 
                    onClick={handleModifyPosts}
                    disabled={!modificationInstruction.trim() || modifying}
                    size="sm"
                    className="h-10 px-4 text-sm"
                  >
                    {modifying ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Modify'
                    )}
                  </Button>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Examples: "more professional tone", "highlight performance", "add emojis", "focus on simplicity"
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings modal with tabs */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[700px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">API Settings</h2>
              <Button 
                onClick={() => setShowSettings(false)} 
                variant="outline" 
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
              {[
                { value: 'gemini', label: 'Google Gemini', color: 'blue' },
                { value: 'openai', label: 'OpenAI GPT', color: 'green' },
                { value: 'anthropic', label: 'Anthropic Claude', color: 'purple' }
              ].map((provider) => (
                <button
                  key={provider.value}
                  onClick={() => setActiveTab(provider.value)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === provider.value
                      ? `border-${provider.color}-500 text-${provider.color}-600`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {provider.label}
                  {apiProvider === provider.value && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="space-y-6">
              {activeTab === 'gemini' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-gray-900">Google Gemini</h3>
                      {apiProvider === 'gemini' && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                          ✓ Active provider
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {apiKeys.gemini && (
                        <div className="flex items-center text-sm text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          Key configured
                        </div>
                      )}
                      {apiKeys.gemini && (
                        <Button
                          onClick={() => removeApiKey('gemini')}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Remove API key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gemini API Key
                      </label>
                      <Input
                        type="password"
                        value={apiKeys.gemini}
                        onChange={(e) => updateApiKey('gemini', e.target.value)}
                        placeholder="sk-..."
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Get your key at: <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://makersuite.google.com/app/apikey</a>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-4">
                      <div className="text-sm text-blue-800">
                        <div className="font-medium mb-2">Model Information</div>
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <div className="font-medium text-gray-600">Model</div>
                            <div>gemini-1.5-flash</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Cost</div>
                            <div>Free (50 req/day)</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Max tokens</div>
                            <div>1M tokens</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'openai' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-gray-900">OpenAI GPT</h3>
                      {apiProvider === 'openai' && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                          ✓ Active provider
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {apiKeys.openai && (
                        <div className="flex items-center text-sm text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          Key configured
                        </div>
                      )}
                      {apiKeys.openai && (
                        <Button
                          onClick={() => removeApiKey('openai')}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Remove API key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        OpenAI API Key
                      </label>
                      <Input
                        type="password"
                        value={apiKeys.openai}
                        onChange={(e) => updateApiKey('openai', e.target.value)}
                        placeholder="sk-..."
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Get your key at: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://platform.openai.com/api-keys</a>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded p-4">
                      <div className="text-sm text-green-800">
                        <div className="font-medium mb-2">Model Information</div>
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <div className="font-medium text-gray-600">Model</div>
                            <div>gpt-3.5-turbo</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Cost</div>
                            <div>Paid</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Max tokens</div>
                            <div>4K tokens</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'anthropic' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-gray-900">Anthropic Claude</h3>
                      {apiProvider === 'anthropic' && (
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
                          ✓ Active provider
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {apiKeys.anthropic && (
                        <div className="flex items-center text-sm text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          Key configured
                        </div>
                      )}
                      {apiKeys.anthropic && (
                        <Button
                          onClick={() => removeApiKey('anthropic')}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Remove API key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Anthropic API Key
                      </label>
                      <Input
                        type="password"
                        value={apiKeys.anthropic}
                        onChange={(e) => updateApiKey('anthropic', e.target.value)}
                        placeholder="sk-ant-..."
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Get your key at: <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://console.anthropic.com/</a>
                      </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded p-4">
                      <div className="text-sm text-purple-800">
                        <div className="font-medium mb-2">Model Information</div>
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <div className="font-medium text-gray-600">Model</div>
                            <div>claude-3-haiku</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Cost</div>
                            <div>Paid</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Max tokens</div>
                            <div>200K tokens</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Common section: Current provider selection */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">API Provider for this project</h3>
                  <div className="text-xs text-gray-500">
                    The selected provider will be used to generate posts
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'gemini', label: 'Google Gemini', color: 'blue' },
                    { value: 'openai', label: 'OpenAI GPT', color: 'green' },
                    { value: 'anthropic', label: 'Anthropic Claude', color: 'purple' }
                  ].map((provider) => {
                    const hasKey = apiKeys[provider.value as keyof typeof apiKeys];
                    return (
                      <button
                        key={provider.value}
                        onClick={() => {
                          setApiProvider(provider.value);
                          localStorage.setItem('apiProvider', provider.value);
                        }}
                        disabled={!hasKey}
                        className={`p-3 border-2 rounded-lg text-sm font-medium transition-all relative ${
                          apiProvider === provider.value
                            ? `border-${provider.color}-500 bg-${provider.color}-50 text-${provider.color}-700`
                            : hasKey
                            ? 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{provider.label}</span>
                          {!hasKey && (
                            <span className="text-xs text-red-500">No key</span>
                          )}
                        </div>
                        {apiProvider === provider.value && (
                          <div className="text-xs mt-1 text-gray-500">
                            ✓ Active for this project
                          </div>
                        )}
                        {hasKey && apiProvider !== provider.value && (
                          <div className="text-xs mt-1 text-gray-400">
                            Key available
                          </div>
                        )}
        </button>
                    );
                  })}
                </div>
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-xs text-blue-800">
                    <div className="font-medium mb-1">💡 Tip:</div>
                    <div>First configure your API key in the corresponding tab, then select this provider as active.</div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={() => setShowSettings(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}

export default App;