import React, { useState, useRef, useEffect, useCallback } from 'react';
import { familyData, FamilyMember } from '../data/familyData';
import { Chat, GenerateContentResponse } from '@google/genai';
import { ChatMessage, VisionItem, OrchestrationLogEntry, ItemType, Priority } from '../types';
import { ai } from '../services/ai';
import * as dbService from '../services/dbService';
import * as openaiService from '../services/openaiService';
import OrchestrationLog from './OrchestrationLog';

interface AIFamilyProps {
    visionItems: VisionItem[];
    log: OrchestrationLogEntry[];
    onAddLogEntry: (entry: Omit<OrchestrationLogEntry, 'id' | 'timestamp'>) => void;
    onUpdateVisionItem: (item: VisionItem) => void;
}

const AIFamily: React.FC<AIFamilyProps> = ({ visionItems, log, onAddLogEntry, onUpdateVisionItem }) => {
    const [activeMemberIndex, setActiveMemberIndex] = useState(0);
    const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
    const [currentMessage, setCurrentMessage] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    const chatInstances = useRef<Map<string, Chat>>(new Map());
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const activeMember = familyData.members[activeMemberIndex];

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistories, activeMember.name]);

    useEffect(() => {
        const member = familyData.members[activeMemberIndex];
        if (!chatHistories[member.name]) {
             setIsChatLoading(true);
             dbService.getChatHistory(member.name)
                .then(history => {
                    const initialMessage = { role: 'model' as const, text: `You are now chatting with ${member.name}, the ${member.role}.` };
                     setChatHistories(prev => ({
                        ...prev,
                        [member.name]: history && history.length > 0 ? history : [initialMessage]
                    }));
                })
                .catch(err => {
                    console.error(`Failed to load chat history for ${member.name}`, err);
                     const initialMessage = { role: 'model' as const, text: `You are now chatting with ${member.name}, the ${member.role}.` };
                     setChatHistories(prev => ({
                        ...prev,
                        [member.name]: [initialMessage]
                    }));
                })
                .finally(() => {
                    setIsChatLoading(false);
                });
        }
    }, [activeMemberIndex]);

    const getOrCreateGeminiChat = (member: FamilyMember): Chat => {
        if (!chatInstances.current.has(member.name)) {
            const newChat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction: member.personality_prompt }
            });
            chatInstances.current.set(member.name, newChat);
        }
        return chatInstances.current.get(member.name)!;
    };
    
    const postMessageToChat = (memberName: string, message: ChatMessage) => {
        setChatHistories(prev => {
            const newHistory = [...(prev[memberName] || []), message];
            dbService.saveChatHistory(memberName, newHistory);
            return { ...prev, [memberName]: newHistory };
        });
    };
    
    const handleAgentTask = useCallback(async (sourceAgent: FamilyMember, targetAgentName: string, task: string) => {
        setIsChatLoading(true);
        postMessageToChat(sourceAgent.name, { role: 'model', text: `Contacting @${targetAgentName} to action: "${task}"...` });
        
        const targetAgent = familyData.members.find(m => m.name.toLowerCase() === targetAgentName.toLowerCase());
        if (!targetAgent) {
            postMessageToChat(sourceAgent.name, { role: 'model', text: `Couldn't find an agent named @${targetAgentName}.` });
            setIsChatLoading(false);
            return;
        }

        onAddLogEntry({ sourceAgent: sourceAgent.name, targetAgent: targetAgent.name, task, status: 'initiated', details: `Task: ${task}` });
        
        let systemPrompt = targetAgent.personality_prompt;
        let userPrompt = '';
        let resultText = '';

        try {
            // Simplified command parsing
            if (task.toLowerCase().includes('summarize') || task.toLowerCase().includes('summary')) {
                 userPrompt = `The following is a list of items from a vision board: ${JSON.stringify(visionItems)}. Synthesize these points into a short, inspiring project vision summary. Focus on the MVP items first.`;
            } else if (task.toLowerCase().includes('analyze')) {
                userPrompt = `Analyze the following vision board items and provide a summary of the distribution of priorities (MVP, Future, etc.) and item types (Idea, User Story, etc.). Provide some key insights. Items: ${JSON.stringify(visionItems)}`;
            } else if (task.toLowerCase().includes('plan')) {
                 const mvpItems = visionItems.filter(i => i.priority === Priority.MVP);
                 userPrompt = `Create a high-level project plan based on these MVP items: ${JSON.stringify(mvpItems)}. Outline the key phases and deliverables.`;
            } else if (task.toLowerCase().includes('vision')) {
                const ideaItems = visionItems.filter(i => i.type === ItemType.IDEA);
                userPrompt = `Based on these raw ideas, craft an inspiring and powerful new vision statement for the project: ${JSON.stringify(ideaItems)}`;
            } else {
                 userPrompt = `I have been asked by the user to perform the following task: "${task}". Please execute this based on your role and capabilities. For context, here is the current vision board data: ${JSON.stringify(visionItems)}`;
            }

            if (targetAgent.engine === 'gemini') {
                const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: userPrompt, config: {systemInstruction: systemPrompt}});
                resultText = response.text;
            } else { // openai
                resultText = await openaiService.fallbackGenerateText(systemPrompt, userPrompt);
            }
            
            onAddLogEntry({ sourceAgent: sourceAgent.name, targetAgent: targetAgent.name, task, status: 'completed', details: resultText.substring(0, 100) + '...' });
            postMessageToChat(sourceAgent.name, { role: 'model', text: `[Report from @${targetAgent.name}]:\n\n${resultText}` });

        } catch (error) {
            console.error(`A2A task failed for ${targetAgent.name}:`, error);
            const errorDetails = error instanceof Error ? error.message : 'Unknown error';
            onAddLogEntry({ sourceAgent: sourceAgent.name, targetAgent: targetAgent.name, task, status: 'failed', details: errorDetails });
            postMessageToChat(sourceAgent.name, { role: 'model', text: `@${targetAgent.name} encountered an error: ${errorDetails}` });
        } finally {
            setIsChatLoading(false);
        }
    }, [visionItems, onAddLogEntry, onUpdateVisionItem]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentMessage.trim() || isChatLoading) return;

        const mentionRegex = /@(\w+)\s+(.*)/;
        const mentionMatch = currentMessage.match(mentionRegex);

        if (mentionMatch) {
            const targetAgentName = mentionMatch[1];
            const task = mentionMatch[2];
            setCurrentMessage('');
            await handleAgentTask(activeMember, targetAgentName, task);
            return;
        }

        const userMessage: ChatMessage = { role: 'user', text: currentMessage };
        postMessageToChat(activeMember.name, userMessage);
        setCurrentMessage('');
        setIsChatLoading(true);

        try {
            let modelMessageText = '';
            if (activeMember.engine === 'gemini') {
                const chat = getOrCreateGeminiChat(activeMember);
                const response = await chat.sendMessage({ message: userMessage.text });
                modelMessageText = response.text;
            } else { // openai
                const history = chatHistories[activeMember.name] || [];
                modelMessageText = await openaiService.fallbackFamilyChat(activeMember.personality_prompt, history, userMessage.text);
            }
            postMessageToChat(activeMember.name, { role: 'model', text: modelMessageText });
        } catch (error) {
            console.error("Chat failed:", error);
            const errorText = error instanceof Error ? error.message : "I'm having trouble connecting right now.";
            postMessageToChat(activeMember.name, { role: 'model', text: `A critical error occurred: ${errorText}` });
        } finally {
            setIsChatLoading(false);
        }
    };


    return (
        <div className="p-4 md:p-8 text-white">
            <div className="text-center mb-8">
                <h2 style={{ color: familyData.colors.accent }} className="text-4xl font-display uppercase tracking-wider text-pink-500" >{familyData.organization}</h2>
                <p className="text-slate-400 mt-2 font-semibold">{familyData.creed}</p>
                <p className="text-slate-500 text-sm mt-1">HQ: {familyData.headquarters} | Motto: "{familyData.protocols.motto}"</p>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-3 bg-slate-900/80 backdrop-blur-md rounded-xl shadow-2xl shadow-pink-500/10 overflow-hidden border border-slate-700/50">
                     <div className="flex flex-wrap border-b border-slate-700/50" role="tablist" aria-orientation="horizontal">
                        {familyData.members.map((member, index) => (
                            <button
                                key={member.name}
                                id={`member-tab-${index}`}
                                role="tab"
                                aria-selected={activeMemberIndex === index}
                                aria-controls={`member-panel-${index}`}
                                onClick={() => setActiveMemberIndex(index)}
                                className={`px-3 sm:px-4 py-3 text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-pink-400 flex-grow text-center sm:flex-grow-0 ${
                                    activeMemberIndex === index
                                        ? 'bg-pink-500 text-black font-bold shadow-lg shadow-pink-500/30'
                                        : 'text-slate-300 font-medium hover:bg-slate-800/70 hover:text-pink-400'
                                }`}
                            >
                                {member.name}
                            </button>
                        ))}
                    </div>
                    
                    <div id={`member-panel-${activeMemberIndex}`} role="tabpanel" aria-labelledby={`member-tab-${activeMemberIndex}`} className="p-6">
                         <div className="grid md:grid-cols-5 gap-6">
                            <div className="md:col-span-2">
                                <h3 className="text-3xl font-display text-white">{activeMember.name}</h3>
                                <p className="text-pink-400 font-semibold text-lg mb-4">{activeMember.role}</p>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-bold text-slate-300 mb-2 border-b border-slate-700/50 pb-1">Engine</h4>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${activeMember.engine === 'gemini' ? 'bg-blue-500/50 text-blue-200' : 'bg-green-500/50 text-green-200'}`}>{activeMember.engine.toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-300 mb-2 border-b border-slate-700/50 pb-1">Skills</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {activeMember.skills.map(skill => (
                                                <span key={skill} className="bg-slate-700 text-slate-300 text-xs font-medium px-2.5 py-1 rounded-full">{skill}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-300 mb-2 border-b border-slate-700/50 pb-1">Personality</h4>
                                        <p className="text-slate-400 break-words text-sm">{activeMember.personality}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-950 rounded-lg border border-slate-700/50 md:col-span-3 flex flex-col h-[400px]">
                                <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto" aria-live="polite">
                                    {(chatHistories[activeMember.name] || []).map((msg, index) => (
                                        <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl shadow-md ${
                                                msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
                                            }`}>
                                                <p className="whitespace-pre-wrap text-sm break-words">{msg.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {isChatLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
                                                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 border-t border-slate-700/50 bg-slate-950/50 rounded-b-lg">
                                    <form onSubmit={handleSendMessage} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={currentMessage}
                                            onChange={(e) => setCurrentMessage(e.target.value)}
                                            placeholder={`Message or use @ to delegate...`}
                                            className="flex-grow bg-slate-800 border border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-pink-500 focus:outline-none transition text-white"
                                            disabled={isChatLoading}
                                            aria-label={`Chat input for ${activeMember.name}`}
                                        />
                                        <button type="submit" disabled={isChatLoading || !currentMessage.trim()} className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed font-semibold shadow-lg shadow-pink-500/30" aria-label="Send message">Send</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Orchestration Log */}
                <div className="lg:col-span-2">
                    <OrchestrationLog log={log} />
                </div>
            </div>
        </div>
    );
};

export default AIFamily;
