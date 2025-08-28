import React, { useState } from 'react';
import { VisionItem, ItemType } from '../types';
import VisionItemCard from './VisionItemCard';
import { SparklesIcon } from './icons';

interface VisualizeIdeasPromptProps {
  count: number;
  onClick: () => void;
  isLoading: boolean;
}

const VisualizeIdeasPrompt: React.FC<VisualizeIdeasPromptProps> = ({ count, onClick, isLoading }) => {
  return (
    <div className="col-span-full mb-6">
        <div className="bg-slate-900/70 backdrop-blur-sm rounded-lg border-2 border-dashed border-purple-500/50 p-6 text-center shadow-lg shadow-purple-500/20 hover:border-purple-500 transition-all duration-300 group">
            <SparklesIcon className="w-12 h-12 mx-auto text-purple-400 group-hover:text-purple-300 transition-colors" />
            <h3 className="mt-4 text-2xl font-display text-white">Bring Your Ideas to Life</h3>
            <p className="mt-2 text-slate-400">
                You have <span className="font-bold text-pink-400">{count}</span> unvisualized {count === 1 ? 'idea' : 'ideas'}. Generate images for all of them with a single click.
            </p>
            <button
                onClick={onClick}
                disabled={isLoading}
                className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all duration-300 transform group-hover:scale-105 bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Visualizing...
                    </>
                ) : `Visualize ${count} ${count === 1 ? 'Idea' : 'Ideas'}`}
            </button>
        </div>
    </div>
  );
};


interface BoardProps {
  items: VisionItem[];
  onUpdateItem: (item: VisionItem) => void;
  onDeleteItem: (id: string) => void;
  onConvertToStory: (id: string) => void;
  onGenerateAC: (id: string) => void;
  onVisualize: (id: string) => void;
  onOpenStyleModal: (item: VisionItem) => void;
  onGenerateHaiku: (id: string) => void;
  onGenerateStoryFromInference: (id: string, genre: string) => void;
  isLoading: boolean;
  onVisualizeAllIdeas: () => void;
  unvisualizedIdeasCount: number;
}

const Board: React.FC<BoardProps> = ({ items, onUpdateItem, onDeleteItem, onConvertToStory, onGenerateAC, onVisualize, onOpenStyleModal, onGenerateHaiku, onGenerateStoryFromInference, isLoading, onVisualizeAllIdeas, unvisualizedIdeasCount }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 6;

  const mainItems = items.filter(item => item.type !== ItemType.VISION_IMAGE);
  const imageItems = items.filter(item => item.type === ItemType.VISION_IMAGE);
  
  const totalPages = Math.ceil(imageItems.length / imagesPerPage);
  const paginatedImageItems = imageItems.slice(
      (currentPage - 1) * imagesPerPage,
      currentPage * imagesPerPage
  );


  if (items.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <SparklesIcon className="w-16 h-16 mx-auto text-slate-700 animate-pulse" />
        <h2 className="mt-4 text-3xl font-display text-slate-400">Your Vision Awaits</h2>
        <p className="mt-2 text-slate-500">
          This is where the magic begins. Add a vision statement or generate ideas to start.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {unvisualizedIdeasCount > 0 && (
          <VisualizeIdeasPrompt
            count={unvisualizedIdeasCount}
            onClick={onVisualizeAllIdeas}
            isLoading={isLoading}
          />
        )}
        {mainItems.map(item => (
          <VisionItemCard
            key={item.id}
            item={item}
            onUpdate={onUpdateItem}
            onDelete={onDeleteItem}
            onConvertToStory={onConvertToStory}
            onGenerateAC={onGenerateAC}
            onVisualize={onVisualize}
            onOpenStyleModal={onOpenStyleModal}
            onGenerateHaiku={onGenerateHaiku}
            onGenerateStoryFromInference={onGenerateStoryFromInference}
            isLoading={isLoading}
          />
        ))}
      </div>

      {imageItems.length > 0 && (
        <div className="mt-16">
            <h2 className="text-3xl font-display text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-8">
                Visual Inferences
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedImageItems.map(item => (
                    <VisionItemCard
                        key={item.id}
                        item={item}
                        onUpdate={onUpdateItem}
                        onDelete={onDeleteItem}
                        onConvertToStory={onConvertToStory}
                        onGenerateAC={onGenerateAC}
                        onVisualize={onVisualize}
                        onOpenStyleModal={onOpenStyleModal}
                        onGenerateHaiku={onGenerateHaiku}
                        onGenerateStoryFromInference={onGenerateStoryFromInference}
                        isLoading={isLoading}
                    />
                ))}
            </div>
            {totalPages > 1 && (
                <div className="mt-8 flex justify-center items-center gap-4">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span className="text-slate-400 font-mono">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Board;