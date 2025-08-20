import React, { useState } from 'react';
import { VisionItem, ItemType } from '../types';
import VisionItemCard from './VisionItemCard';
import { SparklesIcon } from './icons';

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
}

const Board: React.FC<BoardProps> = ({ items, onUpdateItem, onDeleteItem, onConvertToStory, onGenerateAC, onVisualize, onOpenStyleModal, onGenerateHaiku, onGenerateStoryFromInference, isLoading }) => {
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