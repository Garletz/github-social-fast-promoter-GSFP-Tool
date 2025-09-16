import { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle, Copy, ExternalLink, Edit3 } from 'lucide-react';
import type { SocialPost } from '../types';
import { Button } from './ui/Button';
import { getPlatformUrl } from '../lib/platforms';

interface EditablePostProps {
  post: SocialPost;
  onUpdate: (postId: number, updates: Partial<SocialPost>) => void;
  onCopy: (text: string) => void;
  onOpenUrl: (url: string) => void;
  copied: boolean;
}

export function EditablePost({ post, onUpdate, onCopy, onOpenUrl, copied }: EditablePostProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editHashtags, setEditHashtags] = useState(post.hashtags.join(' '));
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const hashtagsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditContent(post.content);
    setEditHashtags(post.hashtags.join(' '));
    setHasChanges(false);
  }, [post.content, post.hashtags]);

  // Auto-save quand on quitte l'édition
  useEffect(() => {
    if (!isEditing && hasChanges) {
      handleAutoSave();
    }
  }, [isEditing, hasChanges]);

  const handleAutoSave = async () => {
    if (!hasChanges || isSaving) return;
    
    setIsSaving(true);
    
    try {
      const hashtagsArray = editHashtags
        .split(' ')
        .map(tag => tag.trim())
        .filter(tag => tag && tag.startsWith('#'))
        .slice(0, 3);

      const updatedContent = editContent.trim();
      const copyText = `${updatedContent} ${hashtagsArray.join(' ')}`.trim();

      onUpdate(post.id!, {
        content: updatedContent,
        hashtags: hashtagsArray,
        characterCount: copyText.length,
        copyText: copyText
      });

      setHasChanges(false);
    } catch (error) {
      console.error('Error auto-saving post:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Quitter l'édition - auto-save sera déclenché par useEffect
      setIsEditing(false);
    } else {
      // Entrer en édition
      setIsEditing(true);
      // Focus sur le textarea après un court délai
      setTimeout(() => {
        contentRef.current?.focus();
      }, 100);
    }
  };

  const handleClickOutside = (e: React.MouseEvent) => {
    // Si on clique en dehors des champs d'édition, quitter l'édition
    if (isEditing && 
        !contentRef.current?.contains(e.target as Node) && 
        !hashtagsRef.current?.contains(e.target as Node)) {
      setIsEditing(false);
    }
  };

  const handleContentChange = (value: string) => {
    setEditContent(value);
    setHasChanges(value !== post.content || editHashtags !== post.hashtags.join(' '));
  };

  const handleHashtagsChange = (value: string) => {
    setEditHashtags(value);
    setHasChanges(editContent !== post.content || value !== post.hashtags.join(' '));
  };

  const getCharacterStatus = () => {
    const percentage = (post.characterCount / post.maxCharacters) * 100;
    if (percentage > 90) return { color: 'text-red-600', icon: AlertCircle };
    if (percentage > 75) return { color: 'text-yellow-600', icon: AlertCircle };
    return { color: 'text-green-600', icon: CheckCircle };
  };

  const status = getCharacterStatus();
  const StatusIcon = status.icon;

  return (
    <div className="border rounded p-2 space-y-2 bg-white hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-xs truncate">{post.platform}</h3>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 ${status.color}`}>
            <StatusIcon className="h-3 w-3" />
            <span className="text-xs">
              {post.characterCount}/{post.maxCharacters}
            </span>
          </div>
          <Button
            onClick={handleEditToggle}
            size="sm"
            variant="outline"
            className="h-8 w-8 p-1"
            disabled={isSaving}
          >
            {isSaving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            ) : (
              <Edit3 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-2" onClick={handleClickOutside}>
          <textarea
            ref={contentRef}
            value={editContent}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full p-2 text-xs border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Contenu du post..."
            onBlur={() => {
              // Auto-save quand on perd le focus
              if (hasChanges) {
                handleAutoSave();
              }
            }}
          />
          <input
            ref={hashtagsRef}
            type="text"
            value={editHashtags}
            onChange={(e) => handleHashtagsChange(e.target.value)}
            className="w-full p-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="#hashtag1 #hashtag2 #hashtag3"
            onBlur={() => {
              // Auto-save quand on perd le focus
              if (hasChanges) {
                handleAutoSave();
              }
            }}
          />
          {hasChanges && (
            <div className="text-xs text-blue-600 flex items-center gap-1">
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
            </div>
          )}
          {isSaving && (
            <div className="text-xs text-green-600 flex items-center gap-1">
              <div className="h-2 w-2 bg-green-600 rounded-full" />
              Sauvegarde en cours...
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-700 line-clamp-3">{post.content}</p>
          
          {post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.hashtags.slice(0, 2).map((hashtag, i) => (
                <span 
                  key={i}
                  className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded"
                >
                  {hashtag}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-1">
            <Button
              onClick={() => onCopy(post.copyText)}
              size="sm"
              className="flex-1 h-8 text-xs"
            >
              {copied ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
            
            <Button
              onClick={() => onOpenUrl(getPlatformUrl(post.platform))}
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
