export type Role = 'participant' | 'ngg_facilitator' | 'maccabi_learning' | 'mentor';
export type Round = 'start' | 'end';
export type SessionStatus = 'scheduled' | 'completed';
export type QuestionKind = 'open' | 'north_star';

export interface Me {
  userId: string;
  email: string;
  displayName: string;
  /** null when the signed-in user is not a member of the Pisga app. */
  role: Role | null;
}

export interface Gate {
  number: number;
  title: string;
}

export interface Speaker {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Material {
  id: string;
  sessionNumber: number;
  title: string;
  storagePath: string;
  fileExt: string | null;
  sortOrder: number;
}

export interface Session {
  number: number;
  title: string | null;
  date: string | null;
  location: string | null;
  gateNumber: number | null;
  description: string | null;
  status: SessionStatus;
  speakers: Speaker[];
  materials: Material[];
}

export interface SessionInput {
  title: string | null;
  date: string | null;
  location: string | null;
  gateNumber: number | null;
  description: string | null;
  status: SessionStatus;
  speakers: string[];
}

export interface Settings {
  mappingPublished: boolean;
  mappingOpenQuestion: string;
  advisorEnabled: boolean;
  advisorOpeningMessage: string;
  advisorSuggestedQuestions: string[];
}

export interface MappingStatement {
  id: string;
  gateNumber: number;
  sortOrder: number;
  body: string;
}

export interface MappingResponse {
  round: Round;
  statementId: string;
  score: number;
}

export interface MappingData {
  responses: MappingResponse[];
  openAnswers: Partial<Record<Round, string>>;
  completedAt: Partial<Record<Round, string>>;
}

export interface JournalQuestion {
  id: string;
  sessionNumber: number;
  sortOrder: number;
  body: string;
  kind: QuestionKind;
}

export interface JournalEntry {
  questionId: string;
  body: string;
}

export interface NorthStarVersion {
  sessionNumber: number;
  body: string;
}

export interface AdvisorMessage {
  role: 'user' | 'advisor';
  text: string;
  /** Source titles the answer is grounded in. Empty when the advisor had no grounded answer. */
  sources?: string[];
}

export interface AdvisorReply {
  text: string;
  sources: string[];
}

export const STAFF_ROLES: Role[] = ['ngg_facilitator', 'maccabi_learning'];
export const isStaff = (role: Role | null | undefined): boolean => !!role && STAFF_ROLES.includes(role);
export const isParticipant = (role: Role | null | undefined): boolean => role === 'participant';
