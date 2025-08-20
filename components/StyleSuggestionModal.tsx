import React, { useState, useEffect } from 'react';
import { VisionItem, Priority } from '../types';
import * as geminiService from '../services/geminiService';
import { WandIcon } from './icons';

interface StyleSuggestionModalProps {
  item: VisionItem | null;
  onClose: () => void;
  onSelectSuggestion: (prompt: string) => void;
}

interface StyleSuggestion {
  styleName: string;
  promptHint: string;
}

const StyleSuggestionModal: React.FC<StyleSuggestionModalProps> = ({ item, onClose, onSelectSuggestion }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<StyleSuggestion[]>([]);

  useEffect(() => {
    if (item && typeof item.content === 'string') {
      setIsLoading(true);
      setSuggestions([]);
      geminiService.generateStyleSuggestions(item.content, item.priority)
        .then(setSuggestions)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [item]);

  if (!item) return null;

  const handleSelect = (suggestion: StyleSuggestion) => {
    if (typeof item.content !== 'string') return;
    const fullPrompt = `${item.content}, ${suggestion.promptHint}`;
    onSelectSuggestion(fullPrompt);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl shadow-blue-500/20 w-full max-w-4xl border border-blue-500/50">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-2xl font-display text-blue-400 flex items-center gap-3">
            <WandIcon className="w-6 h-6" />
            Suggesting Styles for Your Vision
          </h2>
          <p className="text-slate-400 mt-1 truncate">Based on: "{typeof item.content === 'string' ? item.content : 'User Story'}"</p>
        </div>
        
        <div className="p-6 min-h-[250px] flex justify-center items-center">
          {isLoading && (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            </div>
          )}
          {!isLoading && suggestions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(s)}
                  className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-all text-left group h-full flex flex-col"
                >
                  <h3 className="text-lg font-bold text-blue-300 group-hover:text-blue-200">{s.styleName}</h3>
                  <p className="text-slate-400 text-sm mt-2 flex-grow">{s.promptHint}</p>
                </button>
              ))}
            </div>
          )}
           {!isLoading && suggestions.length === 0 && (
            <div className="text-center text-slate-500 h-full flex flex-col justify-center items-center">
                <p>Could not generate style suggestions.</p>
                <p className="text-xs mt-1">Please try again or close this window.</p>
            </div>
          )}
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

export default StyleSuggestionModal;
