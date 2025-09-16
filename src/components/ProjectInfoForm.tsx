import { useState, useEffect } from 'react';
import { Copy } from 'lucide-react';
import { Button } from './ui/Button';

interface ProjectInfo {
  title: string;
  url: string;
  website: string;
  twitter: string;
  description: string;
}

interface ProjectInfoFormProps {
  onInfoChange?: (info: ProjectInfo) => void;
}

export function ProjectInfoForm({ onInfoChange }: ProjectInfoFormProps) {
  const [info, setInfo] = useState<ProjectInfo>({
    title: '',
    url: '',
    website: '',
    twitter: '',
    description: ''
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Charger les infos depuis localStorage au démarrage
  useEffect(() => {
    const savedInfo = localStorage.getItem('project-info');
    if (savedInfo) {
      try {
        const parsed = JSON.parse(savedInfo);
        setInfo(parsed);
        onInfoChange?.(parsed);
      } catch (error) {
        console.error('Error loading project info:', error);
      }
    }
  }, [onInfoChange]);

  // Auto-save quand les infos changent
  useEffect(() => {
    if (info.title || info.url || info.website || info.twitter || info.description) {
      setIsSaving(true);
      localStorage.setItem('project-info', JSON.stringify(info));
      onInfoChange?.(info);
      
      setTimeout(() => {
        setIsSaving(false);
      }, 500);
    }
  }, [info, onInfoChange]);

  const handleFieldChange = (field: keyof ProjectInfo, value: string) => {
    setInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCopy = async (field: keyof ProjectInfo, value: string) => {
    if (!value.trim()) return;
    
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <div className="border-t pt-2">
      <div className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-2">
        Project Info for Launch Forms
        {isSaving && (
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-12">Title:</span>
          <div className="flex-1 flex items-center gap-1">
            <input
              type="text"
              value={info.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Project title"
              className="flex-1 text-xs p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-6"
            />
            <Button
              onClick={() => handleCopy('title', info.title)}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              disabled={!info.title.trim()}
            >
              <Copy className="h-4 w-4 text-gray-700" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-12">URL:</span>
          <div className="flex-1 flex items-center gap-1">
            <input
              type="text"
              value={info.url}
              onChange={(e) => handleFieldChange('url', e.target.value)}
              placeholder="GitHub URL"
              className="flex-1 text-xs p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-6"
            />
            <Button
              onClick={() => handleCopy('url', info.url)}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              disabled={!info.url.trim()}
            >
              <Copy className="h-4 w-4 text-gray-700" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-12">Web:</span>
          <div className="flex-1 flex items-center gap-1">
            <input
              type="text"
              value={info.website}
              onChange={(e) => handleFieldChange('website', e.target.value)}
              placeholder="https://your-website.com"
              className="flex-1 text-xs p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-6"
            />
            <Button
              onClick={() => handleCopy('website', info.website)}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              disabled={!info.website.trim()}
            >
              <Copy className="h-4 w-4 text-gray-700" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-12">Twitter:</span>
          <div className="flex-1 flex items-center gap-1">
            <input
              type="text"
              value={info.twitter}
              onChange={(e) => handleFieldChange('twitter', e.target.value)}
              placeholder="https://twitter.com/yourhandle"
              className="flex-1 text-xs p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-6"
            />
            <Button
              onClick={() => handleCopy('twitter', info.twitter)}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              disabled={!info.twitter.trim()}
            >
              <Copy className="h-4 w-4 text-gray-700" />
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <span className="text-xs text-gray-500 w-12 mt-1">Desc:</span>
          <div className="flex-1 flex items-start gap-1">
            <textarea
              value={info.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Project description for launch platforms"
              rows={2}
              className="flex-1 text-xs p-1 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 h-12"
            />
            <Button
              onClick={() => handleCopy('description', info.description)}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-1 mt-1 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              disabled={!info.description.trim()}
            >
              <Copy className="h-4 w-4 text-gray-700" />
            </Button>
          </div>
        </div>
      </div>
      
      {copiedField && (
        <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
          <div className="h-2 w-2 bg-green-600 rounded-full" />
          {copiedField} copied to clipboard!
        </div>
      )}
    </div>
  );
}
