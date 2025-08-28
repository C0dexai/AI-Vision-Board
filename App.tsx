import React, { useState, useEffect, useCallback } from 'react';
import { ItemType, Priority, VisionItem, UserStory, VisionImageContent, OrchestrationLogEntry } from './types';
import * as geminiService from './services/geminiService';
import * as dbService from './services/dbService';
import Board from './components/Board';
import AiHelperModal from './components/AiHelperModal';
import StyleSuggestionModal from './components/StyleSuggestionModal';
import LandingPage from './components/LandingPage';
import FloatingMenu from './components/FloatingMenu';
import AIFamily from './components/AIFamily';

const App = () => {
    const [items, setItems] = useState<VisionItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAppEntered, setIsAppEntered] = useState(false);
    const [currentView, setCurrentView] = useState<'board' | 'family'>('board');
    const [log, setLog] = useState<OrchestrationLogEntry[]>([]);

    const [modalState, setModalState] = useState({
        isOpen: false,
        mode: 'ideas' as 'ideas' | 'summary',
        generatedContent: [] as string[] | string,
    });
    
    const [styleModalItem, setStyleModalItem] = useState<VisionItem | null>(null);

    useEffect(() => {
        dbService.getAllVisionItems().then((storedItems) => {
            if (storedItems && storedItems.length > 0) {
                setItems(storedItems.sort((a, b) => (a.type === 'VISION_IMAGE' ? 1 : -1) - (b.type === 'VISION_IMAGE' ? 1 : -1) || 0));
            }
        }).catch(err => {
            console.error("Failed to load items from DB", err);
            setError("Could not load saved data. Working with a fresh board.");
        }).finally(() => {
            setIsInitializing(false);
        });
    }, []);
    
    const handleAddLogEntry = useCallback((entry: Omit<OrchestrationLogEntry, 'id' | 'timestamp'>) => {
        const newEntry: OrchestrationLogEntry = {
            ...entry,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        };
        setLog(prev => [...prev, newEntry]);
    }, []);

    const handleAddItem = useCallback(async (type: 'VISION_STATEMENT' | 'IDEA') => {
        const newItem: VisionItem = {
            id: crypto.randomUUID(),
            type: type === 'VISION_STATEMENT' ? ItemType.VISION_STATEMENT : ItemType.IDEA,
            content: type === 'VISION_STATEMENT' ? 'My vision is to...' : 'A new brilliant idea...',
            acceptanceCriteria: [],
            priority: Priority.NONE,
        };
        setItems(prev => [newItem, ...prev]);
        try {
            await dbService.saveVisionItem(newItem);
        } catch (err) {
            setError("Could not save the new item. It will be lost on refresh.");
        }
    }, []);

    const handleUpdateItem = useCallback(async (updatedItem: VisionItem) => {
        setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        try {
            await dbService.saveVisionItem(updatedItem);
        } catch (err) {
            setError("Could not save your changes. They will be lost on refresh.");
        }
    }, []);

    const handleDeleteItem = useCallback(async (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
        try {
            await dbService.deleteVisionItem(id);
        } catch (err) {
            setError("Could not delete the item from storage.");
        }
    }, []);

    const handleConvertToStory = useCallback(async (id: string) => {
        const item = items.find(i => i.id === id);
        if (!item || typeof item.content !== 'string') return;

        setIsLoading(true);
        setError(null);
        try {
            const story = await geminiService.generateUserStory(item.content);
            if (story) {
                const updatedItem: VisionItem = {
                    ...item,
                    type: ItemType.USER_STORY,
                    content: story,
                };
                await handleUpdateItem(updatedItem);
            } else {
                setError("Failed to convert to a user story.");
            }
        } catch (e) {
            setError("An error occurred during conversion.");
        } finally {
            setIsLoading(false);
        }
    }, [items, handleUpdateItem]);
    
    const handleGenerateAC = useCallback(async (id: string) => {
        const item = items.find(i => i.id === id);
        if(!item || typeof item.content === 'string') return;
        
        setIsLoading(true);
        setError(null);
        try {
            const criteria = await geminiService.generateAcceptanceCriteria(item.content as UserStory);
            if (criteria.length > 0) {
                const updatedItem: VisionItem = {
                    ...item,
                    acceptanceCriteria: [...item.acceptanceCriteria, ...criteria],
                };
                await handleUpdateItem(updatedItem);
            } else {
                setError("Could not generate acceptance criteria.");
            }
        } catch (e) {
            setError("An error occurred generating acceptance criteria.");
        } finally {
            setIsLoading(false);
        }
    }, [items, handleUpdateItem]);

    const handleVisualize = useCallback(async (id: string, promptOverride?: string) => {
        const item = items.find(i => i.id === id);
        if (!item || (item.type !== ItemType.VISION_STATEMENT && item.type !== ItemType.IDEA) || typeof item.content !== 'string') return;

        const prompt = promptOverride || item.content;

        setIsLoading(true);
        setError(null);
        try {
            const result = await geminiService.generateImageAndSummary(prompt);
            if (result) {
                const newImageItem: VisionItem = {
                    id: crypto.randomUUID(),
                    type: ItemType.VISION_IMAGE,
                    content: {
                        prompt: prompt,
                        imageUrl: result.imageUrl,
                        summary: result.summary,
                    },
                    acceptanceCriteria: [],
                    priority: item.priority,
                    sourceItemId: item.id,
                };
                setItems(prev => [newImageItem, ...prev]);
                await dbService.saveVisionItem(newImageItem);
            } else {
                setError("Failed to generate visualization.");
            }
        } catch (e) {
            setError("An error occurred during visualization.");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [items]);
    
    const handleVisualizeAllIdeas = useCallback(async () => {
        const visualizedItemIds = new Set(
            items
                .filter(item => item.type === ItemType.VISION_IMAGE && item.sourceItemId)
                .map(item => item.sourceItemId)
        );
    
        const ideasToVisualize = items.filter(
            item => item.type === ItemType.IDEA && !visualizedItemIds.has(item.id) && typeof item.content === 'string'
        );
    
        if (ideasToVisualize.length === 0) {
            setError("All ideas have already been visualized, or there are no ideas to visualize.");
            setTimeout(() => setError(null), 5000);
            return;
        }
    
        setIsLoading(true);
        setError(null);
        try {
            const visualizationPromises = ideasToVisualize.map(async (item) => {
                try {
                    const result = await geminiService.generateImageAndSummary(item.content as string);
                    if (result) {
                        const newImageItem: VisionItem = {
                            id: crypto.randomUUID(),
                            type: ItemType.VISION_IMAGE,
                            content: {
                                prompt: item.content as string,
                                imageUrl: result.imageUrl,
                                summary: result.summary,
                            },
                            acceptanceCriteria: [],
                            priority: item.priority,
                            sourceItemId: item.id,
                        };
                        return newImageItem;
                    }
                } catch (error) {
                    console.error(`Failed to visualize idea ${item.id}:`, error);
                }
                return null;
            });
            
            const newImageItems = (await Promise.all(visualizationPromises)).filter((item): item is VisionItem => item !== null);
    
            if (newImageItems.length > 0) {
                setItems(prev => [...newImageItems, ...prev]);
                await Promise.all(newImageItems.map(item => dbService.saveVisionItem(item)));
            }
            
            if (newImageItems.length < ideasToVisualize.length) {
                setError(`Successfully visualized ${newImageItems.length} of ${ideasToVisualize.length} ideas. Some failed.`);
            }
    
        } catch (e) {
            setError("An error occurred during batch visualization.");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [items]);

    const handleGenerateHaiku = useCallback(async (id: string) => {
        const item = items.find(i => i.id === id);
        if (!item || item.type !== ItemType.VISION_IMAGE) return;

        setIsLoading(true);
        setError(null);
        const imageContent = item.content as VisionImageContent;
        try {
            const haiku = await geminiService.generateHaiku(imageContent.summary);
            const updatedContent: VisionImageContent = { ...imageContent, haiku };
            const updatedItem: VisionItem = { ...item, content: updatedContent };
            await handleUpdateItem(updatedItem);
        } catch (e) {
            setError("Failed to generate haiku.");
        } finally {
            setIsLoading(false);
        }
    }, [items, handleUpdateItem]);

    const handleGenerateStoryFromInference = useCallback(async (id: string, genre: string) => {
        const sourceItem = items.find(i => i.id === id);
        if (!sourceItem || sourceItem.type !== ItemType.VISION_IMAGE) return;
        
        setIsLoading(true);
        setError(null);
        const imageContent = sourceItem.content as VisionImageContent;
        
        try {
            const story = await geminiService.generateStoryFromInference(imageContent.summary, genre);
            if (story) {
                const newUserStoryItem: VisionItem = {
                    id: crypto.randomUUID(),
                    type: ItemType.USER_STORY,
                    content: story,
                    priority: sourceItem.priority,
                    acceptanceCriteria: [],
                    sourceImageId: sourceItem.id,
                };
                setItems(prev => [newUserStoryItem, ...prev]);
                await dbService.saveVisionItem(newUserStoryItem);
            } else {
                setError("Failed to generate story from inference.");
            }
        } catch (e) {
            setError("An error occurred generating the story.");
        } finally {
            setIsLoading(false);
        }
    }, [items]);
    
    const handleOpenStyleModal = useCallback((item: VisionItem) => {
        setStyleModalItem(item);
    }, []);

    const handleCloseStyleModal = useCallback(() => {
        setStyleModalItem(null);
    }, []);

    const handleSelectStyleSuggestion = useCallback((fullPrompt: string) => {
        if (styleModalItem) {
            handleVisualize(styleModalItem.id, fullPrompt);
        }
        handleCloseStyleModal();
    }, [styleModalItem, handleVisualize, handleCloseStyleModal]);

    const handleOpenAiModal = (mode: 'ideas' | 'summary') => {
        setModalState({ isOpen: true, mode, generatedContent: [] });
        if (mode === 'summary') {
             handleAIGenerate('', 'summary');
        }
    };

    const handleCloseAiModal = () => {
        setModalState({ isOpen: false, mode: 'ideas', generatedContent: [] });
    };

    const handleAIGenerate = async (prompt: string, mode: 'ideas' | 'summary') => {
        setIsLoading(true);
        setError(null);
        setModalState(prev => ({ ...prev, generatedContent: [] }));

        try {
            if (mode === 'ideas') {
                const ideas = await geminiService.generateIdeas(prompt);
                setModalState(prev => ({ ...prev, generatedContent: ideas }));
                if (ideas.length > 0) {
                    const newItems: VisionItem[] = ideas.map(idea => ({
                        id: crypto.randomUUID(),
                        type: ItemType.IDEA,
                        content: idea,
                        acceptanceCriteria: [],
                        priority: Priority.NONE
                    }));
                    setItems(prev => [...newItems, ...prev]);
                    try {
                        await Promise.all(newItems.map(item => dbService.saveVisionItem(item)));
                    } catch (err) {
                        setError("Could not save generated ideas. They will be lost on refresh.");
                    }
                }
            } else if (mode === 'summary') {
                const summary = await geminiService.summarizeVision(items);
                setModalState(prev => ({ ...prev, generatedContent: summary }));
            }
        } catch (e) {
            setError(`An error occurred while generating ${mode}.`);
        } finally {
            setIsLoading(false);
        }
    };

    const visualizedItemIds = new Set(
        items
            .filter(item => item.type === ItemType.VISION_IMAGE && item.sourceItemId)
            .map(item => item.sourceItemId)
    );

    const unvisualizedIdeasCount = items.filter(
        item => item.type === ItemType.IDEA && !visualizedItemIds.has(item.id)
    ).length;
    
    if (isInitializing) {
        return (
            <div className="min-h-screen flex justify-center items-center text-white">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500"></div>
                <p className="ml-4 text-xl font-display">Initializing Vision...</p>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen">
            {!isAppEntered ? (
                <LandingPage onEnter={() => setIsAppEntered(true)} />
            ) : (
                <>
                    <div className="absolute top-4 left-4 z-20">
                        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-400 font-display" style={{textShadow: '0 0 10px rgba(236, 72, 153, 0.5)'}}>
                            AI Vision Board
                        </h1>
                    </div>

                    {error && (
                        <div className="bg-red-900/50 border border-red-500/70 text-red-300 p-4 m-4 rounded-lg shadow-lg shadow-red-500/20 fixed top-16 left-4 right-4 z-50">
                            <strong>Notice:</strong> {error}
                            <button onClick={() => setError(null)} className="float-right font-bold">X</button>
                        </div>
                    )}
                    
                    {currentView === 'board' && (
                        <main className="pt-20">
                            <Toolbar 
                                onAddItem={handleAddItem} 
                                onOpenAiModal={handleOpenAiModal}
                            />
                            <Board 
                                items={items} 
                                onUpdateItem={handleUpdateItem} 
                                onDeleteItem={handleDeleteItem}
                                onConvertToStory={handleConvertToStory}
                                onGenerateAC={handleGenerateAC}
                                onVisualize={handleVisualize}
                                onOpenStyleModal={handleOpenStyleModal}
                                onGenerateHaiku={handleGenerateHaiku}
                                onGenerateStoryFromInference={handleGenerateStoryFromInference}
                                isLoading={isLoading}
                                onVisualizeAllIdeas={handleVisualizeAllIdeas}
                                unvisualizedIdeasCount={unvisualizedIdeasCount}
                            />
                        </main>
                    )}

                    {currentView === 'family' && (
                        <main className="pt-8">
                           <AIFamily 
                             visionItems={items}
                             log={log}
                             onAddLogEntry={handleAddLogEntry}
                             onUpdateVisionItem={handleUpdateItem}
                           />
                        </main>
                    )}
                    
                    <FloatingMenu onSetView={setCurrentView} />
                    
                    <AiHelperModal
                        isOpen={modalState.isOpen}
                        mode={modalState.mode}
                        onClose={handleCloseAiModal}
                        onGenerate={handleAIGenerate}
                        generatedContent={modalState.generatedContent}
                        isLoading={isLoading}
                    />

                    {styleModalItem && (
                        <StyleSuggestionModal
                            item={styleModalItem}
                            onClose={handleCloseStyleModal}
                            onSelectSuggestion={handleSelectStyleSuggestion}
                        />
                    )}
                </>
            )}
        </div>
    );
};

const Toolbar: React.FC<{ onAddItem: (type: 'VISION_STATEMENT' | 'IDEA') => void; onOpenAiModal: (mode: 'ideas' | 'summary') => void; }> = ({ onAddItem, onOpenAiModal }) => {
  const buttonBaseStyle = "flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold transition-all duration-300 transform hover:scale-105";
  return (
    <div className="p-4 flex justify-center items-center flex-wrap gap-4 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-800">
      <button onClick={() => onAddItem('VISION_STATEMENT')} className={`${buttonBaseStyle} bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50`}> <span className="w-5 h-5">+</span> Add Vision </button>
      <button onClick={() => onAddItem('IDEA')} className={`${buttonBaseStyle} bg-pink-600 hover:bg-pink-500 shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50`}> <span className="w-5 h-5">+</span> Add Idea </button>
      <button onClick={() => onOpenAiModal('ideas')} className={`${buttonBaseStyle} bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50`}> ✨ Generate Ideas </button>
      <button onClick={() => onOpenAiModal('summary')} className={`${buttonBaseStyle} bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/30 hover:shadow-green-500/50`}> ✨ Summarize Vision </button>
    </div>
  );
};

export default App;