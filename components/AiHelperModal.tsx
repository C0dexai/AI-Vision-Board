
import React, { useState } from 'react';
import { SparklesIcon } from './icons';

type ModalMode = 'ideas' | 'summary';

interface AiHelperModalProps {
  isOpen: boolean;
  mode: ModalMode;
  onClose: () => void;
  onGenerate: (prompt: string, mode: ModalMode) => Promise<void>;
  generatedContent: string | string[];
  isLoading: boolean;
}

const AiHelperModal: React.FC<AiHelperModalProps> = ({ isOpen, mode, onClose, onGenerate, generatedContent, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  if (!isOpen) return null;

  const title = mode === 'ideas' ? 'Generate Ideas' : 'Summarize Vision';
  const description = mode === 'ideas' 
    ? 'Enter a topic, and our AI will brainstorm some creative starting points for you.'
    : 'Let our AI create an inspiring summary of your entire vision board.';
  const placeholder = mode === 'ideas' ? 'e.g., "A real-time project management dashboard for dev teams"' : '';
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt || mode === 'summary') {
      onGenerate(prompt, mode);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
        </div>
      );
    }

    if (Array.isArray(generatedContent)) {
      return (
        <ul className="space-y-2">
          {generatedContent.map((item, index) => (
            <li key={index} className="bg-slate-700/50 p-3 rounded-md border border-slate-600/50 break-words">{item}</li>
          ))}
        </ul>
      );
    }
    
    if(typeof generatedContent === 'string' && generatedContent) {
        return <p className="whitespace-pre-wrap bg-slate-700/50 p-3 rounded-md border border-slate-600/50 break-words">{generatedContent}</p>
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl shadow-purple-500/20 w-full max-w-2xl border border-purple-500/50">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-2xl font-display text-purple-400 flex items-center gap-3">
            <SparklesIcon className="w-6 h-6" />
            {title}
          </h2>
          <p className="text-slate-400 mt-1">{description}</p>
        </div>
        
        <div className="p-6">
          {mode === 'ideas' && (
            <form onSubmit={handleSubmit}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholder}
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
                rows={3}
              />
              <button
                type="submit"
                disabled={isLoading || !prompt}
                className="mt-4 w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed font-semibold shadow-lg shadow-purple-500/30"
              >
                {isLoading ? 'Generating...' : 'Generate'}
              </button>
            </form>
          )}

          {mode === 'summary' && !generatedContent && (
             <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed font-semibold shadow-lg shadow-purple-500/30"
              >
                {isLoading ? 'Generating...' : 'Create Summary'}
              </button>
          )}

          <div className="mt-6">
            {renderContent()}
          </div>
        </div>

        <div className="p-4 bg-slate-950/50 rounded-b-xl text-right border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiHelperModal;
