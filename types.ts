export enum ItemType {
  VISION_STATEMENT = 'VISION_STATEMENT',
  IDEA = 'IDEA',
  USER_STORY = 'USER_STORY',
  VISION_IMAGE = 'VISION_IMAGE',
}

export enum Priority {
  NONE = 'NONE',
  MVP = 'MVP',
  FUTURE = 'FUTURE',
  PARKING_LOT = 'PARKING_LOT',
}

export interface UserStory {
  asA: string;
  iWantTo: string;
  soThat: string;
}

export interface VisionImageContent {
  prompt: string;
  imageUrl: string;
  summary: string;
  haiku?: string;
}

export interface VisionItem {
  id: string;
  type: ItemType;
  content: string | UserStory | VisionImageContent;
  acceptanceCriteria: string[];
  priority: Priority;
  sourceImageId?: string;
}

// Added for AIFamily chat functionality
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Added for Orchestration Log
export interface OrchestrationLogEntry {
  id:string;
  timestamp: number;
  sourceAgent: string;
  targetAgent: string;
  task: string;
  status: 'initiated' | 'completed' | 'failed';
  details: string;
}