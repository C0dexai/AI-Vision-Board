import React, { useState } from 'react';
import { ItemType, Priority, UserStory, VisionItem, VisionImageContent } from '../types';
import { TrashIcon, WandIcon, ConvertIcon, SparklesIcon, ImageIcon, HaikuIcon, BookmarkIcon } from './icons';

interface VisionItemCardProps {
  item: VisionItem;
  onUpdate: (item: VisionItem) => void;
  onDelete: (id: string) => void;
  onConvertToStory: (id: string) => void;
  onGenerateAC: (id: string) => void;
  onVisualize: (id: string) => void;
  onOpenStyleModal: (item: VisionItem) => void;
  onGenerateHaiku: (id: string) => void;
  onGenerateStoryFromInference: (id: string, genre: string) => void;
  isLoading: boolean;
}

const priorityStyles: { [key in Priority]: string } = {
  [Priority.NONE]: 'border-slate-700',
  [Priority.MVP]: 'border-pink-500 shadow-lg shadow-pink-500/20',
  [Priority.FUTURE]: 'border-blue-500 shadow-lg shadow-blue-500/20',
  [Priority.PARKING_LOT]: 'border-green-500 shadow-lg shadow-green-500/20',
};

const priorityLabels: { [key in Priority]: string } = {
    [Priority.NONE]: 'No Priority',
    [Priority.MVP]: 'MVP',
    [Priority.FUTURE]: 'Future',
    [Priority.PARKING_LOT]: 'Parking Lot'
};

const VisionItemCard: React.FC<VisionItemCardProps> = ({ item, onUpdate, onDelete, onConvertToStory, onGenerateAC, onVisualize, onOpenStyleModal, onGenerateHaiku, onGenerateStoryFromInference, isLoading }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableContent, setEditableContent] = useState(typeof item.content === 'string' ? item.content : '');
    const storyGenres = ['Science Fiction', 'Fantasy', 'Horror', 'Cyberpunk', 'Steampunk'];

    const handleContentBlur = () => {
        setIsEditing(false);
        if (typeof item.content === 'string') {
            onUpdate({ ...item, content: editableContent });
        }
    };

    const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdate({ ...item, priority: e.target.value as Priority });
    };

    const renderContent = () => {
        if (item.type === ItemType.VISION_IMAGE) {
            const imageContent = item.content as VisionImageContent;
            return (
                <div>
                    <img src={imageContent.imageUrl} alt={imageContent.prompt} className="rounded-md mb-3 object-cover w-full h-48 border border-slate-700" />
                    <blockquote className="border-l-4 border-slate-500 pl-4 py-2 bg-slate-800/50 rounded-r-md">
                        <p className="text-slate-300 italic">{imageContent.summary}</p>
                    </blockquote>
                     {imageContent.haiku && (
                        <div className="mt-3 p-3 bg-slate-800/70 rounded-md border border-slate-700/50 transition-all">
                           <p className="font-mono text-center text-teal-300 whitespace-pre-wrap text-sm">{imageContent.haiku}</p>
                        </div>
                    )}
                </div>
            )
        }

        if (item.type === ItemType.USER_STORY && typeof item.content !== 'string') {
            const story = item.content as UserStory;
            const content = (
                 <div className="mt-2 space-y-3 text-slate-300 break-words">
                    <p><span className="font-semibold text-slate-400">As a</span> {story.asA}</p>
                    <p><span className="font-semibold text-slate-400">I want to</span> {story.iWantTo}</p>
                    <p><span className="font-semibold text-slate-400">so that</span> {story.soThat}</p>
                </div>
            );

            if (item.sourceImageId) {
                return (
                    <details>
                        <summary className="cursor-pointer font-semibold text-slate-400 hover:text-white transition">View Story Details</summary>
                        {content}
                    </details>
                );
            }
            return content;
        }
        
        if (isEditing) {
            return (
                <textarea
                    value={editableContent}
                    onChange={(e) => setEditableContent(e.target.value)}
                    onBlur={handleContentBlur}
                    autoFocus
                    className="w-full h-32 bg-slate-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
            );
        }

        return <p className="text-lg whitespace-pre-wrap text-slate-200 break-words" onClick={() => setIsEditing(true)}>{item.content as string}</p>;
    }

    return (
        <div className={`bg-slate-900/70 backdrop-blur-sm rounded-lg border-l-4 ${priorityStyles[item.priority]} flex flex-col transition-all duration-300`}>
            <div className="p-4 flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        {item.type === ItemType.VISION_STATEMENT && <h3 className="font-display text-2xl text-purple-400">Vision Statement</h3>}
                        {item.type === ItemType.IDEA && <h3 className="font-display text-2xl text-pink-400">Idea</h3>}
                        {item.type === ItemType.USER_STORY && <h3 className="font-display text-2xl text-blue-400">User Story</h3>}
                        {item.type === ItemType.VISION_IMAGE && <h3 className="font-display text-2xl text-teal-400">Visual Inference</h3>}
                    </div>
                    {item.type === ItemType.USER_STORY && item.sourceImageId && (
                         <div className="text-teal-400" title={`Evolved from image ${item.sourceImageId}`}>
                            <BookmarkIcon className="w-5 h-5"/>
                         </div>
                    )}
                </div>
                
                <div className="cursor-pointer min-h-[80px]">
                    {renderContent()}
                </div>
                
                 {item.type === ItemType.VISION_IMAGE && (
                     <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <h4 className="font-semibold text-slate-300 mb-2">Evolve</h4>
                        <div className="flex justify-between items-center">
                             <button onClick={() => onGenerateHaiku(item.id)} disabled={isLoading} className="flex items-center gap-2 p-2 text-slate-400 hover:text-teal-400 transition-colors disabled:opacity-50" title="Generate Haiku"><HaikuIcon className="w-5 h-5"/> Generate Haiku</button>
                        </div>
                        <div className="mt-3">
                           <h5 className="text-sm font-semibold text-slate-400 mb-2">Generate Story in Genre:</h5>
                            <div className="flex flex-wrap gap-2">
                                {storyGenres.map(genre => (
                                <button
                                    key={genre}
                                    onClick={() => onGenerateStoryFromInference(item.id, genre)}
                                    disabled={isLoading}
                                    className="text-xs px-2.5 py-1.5 bg-slate-700/80 hover:bg-purple-600/80 rounded-md transition-colors font-semibold disabled:opacity-50"
                                >
                                    {genre}
                                </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {item.acceptanceCriteria.length > 0 && (
                     <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <h4 className="font-semibold text-slate-300 mb-2">Acceptance Criteria</h4>
                        <ul className="list-disc list-inside space-y-1 text-slate-400">
                            {item.acceptanceCriteria.map((ac, index) => <li key={index} className="break-words">{ac}</li>)}
                        </ul>
                    </div>
                )}
            </div>

            <div className="bg-slate-900/50 p-2 flex justify-between items-center rounded-b-lg border-t border-slate-800">
                <div className="flex items-center gap-2">
                    {(item.type === ItemType.VISION_STATEMENT || item.type === ItemType.IDEA) && (
                        <button onClick={() => onOpenStyleModal(item)} disabled={isLoading} className="p-2 text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50" title="Suggest Styles"><WandIcon className="w-5 h-5"/></button>
                    )}
                    {item.type === ItemType.VISION_STATEMENT && (
                         <button onClick={() => onVisualize(item.id)} disabled={isLoading} className="p-2 text-slate-400 hover:text-teal-400 transition-colors disabled:opacity-50" title="Visualize Vision"><ImageIcon className="w-5 h-5"/></button>
                    )}
                    {item.type === ItemType.IDEA && (
                         <button onClick={() => onConvertToStory(item.id)} disabled={isLoading} className="p-2 text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50" title="Convert to User Story"><ConvertIcon className="w-5 h-5"/></button>
                    )}
                    {item.type === ItemType.USER_STORY && (
                        <button onClick={() => onGenerateAC(item.id)} disabled={isLoading} className="p-2 text-slate-400 hover:text-green-400 transition-colors disabled:opacity-50" title="Generate Acceptance Criteria"><SparklesIcon className="w-5 h-5"/></button>
                    )}
                    <select value={item.priority} onChange={handlePriorityChange} className="bg-slate-700 text-xs rounded p-1 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500">
                        {Object.values(Priority).map(p => <option key={p} value={p}>{priorityLabels[p]}</option>)}
                    </select>
                </div>
                <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Delete Item"><TrashIcon className="w-5 h-5"/></button>
            </div>
        </div>
    );
};

export default VisionItemCard;