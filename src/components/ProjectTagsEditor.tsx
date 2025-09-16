import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Edit3, Plus, X, Save, RotateCcw } from 'lucide-react';

interface ProjectTagsEditorProps {
  projectType: string;
  technologies: string;
  keyFeatures: string[];
  onUpdate: (updates: { projectType: string; technologies: string; keyFeatures: string[] }) => void;
}

export function ProjectTagsEditor({ projectType, technologies, keyFeatures, onUpdate }: ProjectTagsEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProjectType, setEditedProjectType] = useState(projectType);
  const [editedTechnologies, setEditedTechnologies] = useState(technologies);
  const [editedFeatures, setEditedFeatures] = useState([...keyFeatures]);
  const [newFeature, setNewFeature] = useState('');

  const handleSave = () => {
    onUpdate({
      projectType: editedProjectType,
      technologies: editedTechnologies,
      keyFeatures: editedFeatures
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProjectType(projectType);
    setEditedTechnologies(technologies);
    setEditedFeatures([...keyFeatures]);
    setIsEditing(false);
  };

  const addFeature = () => {
    if (newFeature.trim() && !editedFeatures.includes(newFeature.trim())) {
      setEditedFeatures([...editedFeatures, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setEditedFeatures(editedFeatures.filter((_, i) => i !== index));
  };

  if (!isEditing) {
    return (
      <div className="bg-white border rounded-lg p-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-gray-700">Project Tags</h3>
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
            className="h-5 px-2 text-xs"
          >
            <Edit3 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
        
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-600 text-xs">Type:</span>
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
              {projectType}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-600 text-xs">Tech:</span>
            <div className="flex flex-wrap gap-1">
              {technologies.split(', ').slice(0, 3).map((tech, index) => (
                <span key={index} className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                  {tech}
                </span>
              ))}
              {technologies.split(', ').length > 3 && (
                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  +{technologies.split(', ').length - 3}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-600 text-xs">Features:</span>
            <div className="flex flex-wrap gap-1">
              {keyFeatures.slice(0, 2).map((feature, index) => (
                <span key={index} className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                  {feature}
                </span>
              ))}
              {keyFeatures.length > 2 && (
                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  +{keyFeatures.length - 2}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-gray-700">Edit Tags</h3>
        <div className="flex gap-1">
          <Button
            onClick={handleSave}
            size="sm"
            className="h-5 px-2 text-xs"
          >
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
          <Button
            onClick={handleCancel}
            variant="outline"
            size="sm"
            className="h-5 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
      
      <div className="space-y-2 text-xs">
        {/* Type de projet */}
        <div>
          <label className="block font-medium text-gray-600 mb-1 text-xs">Type:</label>
          <Input
            value={editedProjectType}
            onChange={(e) => setEditedProjectType(e.target.value)}
            placeholder="Ex: Desktop App (Tauri)"
            className="h-6 text-xs"
          />
        </div>
        
        {/* Technologies */}
        <div>
          <label className="block font-medium text-gray-600 mb-1 text-xs">Technologies:</label>
          <Input
            value={editedTechnologies}
            onChange={(e) => setEditedTechnologies(e.target.value)}
            placeholder="Ex: TypeScript, Rust, Tauri"
            className="h-6 text-xs"
          />
        </div>
        
        {/* Fonctionnalités */}
        <div>
          <label className="block font-medium text-gray-600 mb-1 text-xs">Features:</label>
          <div className="space-y-1">
            {editedFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-xs flex-1">
                  {feature}
                </span>
                <Button
                  onClick={() => removeFeature(index)}
                  variant="outline"
                  size="sm"
                  className="h-5 w-5 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            
            <div className="flex gap-1">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="New feature"
                className="h-6 text-xs flex-1"
                onKeyPress={(e) => e.key === 'Enter' && addFeature()}
              />
              <Button
                onClick={addFeature}
                variant="outline"
                size="sm"
                className="h-6 px-2"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
