import type {
  AdvisorMessage, AdvisorReply, Gate, JournalEntry, JournalQuestion, MappingData, MappingStatement,
  Material, Me, NorthStarVersion, QuestionKind, Role, Round, Session, SessionInput, Settings,
} from './types';

/**
 * Everything the interface needs from a backend. Two implementations exist:
 * `supabaseApi` (the real backend) and `demoApi` (sample data kept in the browser).
 */
export interface Api {
  // --- authentication ---
  /** Calls back with the signed-in user (or null) now and on every change. Returns an unsubscribe function. */
  onAuthChange(callback: (event: AuthEvent) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  loadMe(userId: string, email: string): Promise<Me>;

  // --- shared content ---
  listGates(): Promise<Gate[]>;
  listSessions(): Promise<Session[]>;
  getSettings(): Promise<Settings>;
  listMappingStatements(): Promise<MappingStatement[]>;
  /** A short-lived link to download a session document. */
  getMaterialUrl(material: Material): Promise<string>;

  // --- personal (participant only) ---
  getMapping(): Promise<MappingData>;
  saveMappingResponse(round: Round, statementId: string, score: number): Promise<void>;
  saveMappingOpenAnswer(round: Round, body: string): Promise<void>;
  completeMapping(round: Round): Promise<void>;
  /** Questions of sessions whose date has arrived (all questions for staff). */
  listJournalQuestions(): Promise<JournalQuestion[]>;
  listJournalEntries(): Promise<JournalEntry[]>;
  saveJournalEntry(questionId: string, body: string): Promise<void>;
  listNorthStarVersions(): Promise<NorthStarVersion[]>;
  saveNorthStar(sessionNumber: number, body: string): Promise<void>;
  askAdvisor(conversation: AdvisorMessage[]): Promise<AdvisorReply>;

  // --- content management (staff only) ---
  saveSession(number: number, input: SessionInput): Promise<void>;
  uploadMaterial(sessionNumber: number, title: string, file: File): Promise<void>;
  removeMaterial(material: Material): Promise<void>;
  saveMappingStatement(gateNumber: number, sortOrder: number, body: string): Promise<void>;
  saveJournalQuestion(sessionNumber: number, sortOrder: number, body: string, kind: QuestionKind): Promise<void>;
  removeJournalQuestion(id: string): Promise<void>;
  saveSettings(patch: Partial<Settings>): Promise<void>;
}

export interface AuthEvent {
  user: { id: string; email: string } | null;
  /** True when the user arrived through a password-recovery link. */
  recovery: boolean;
}

/** An error whose message is safe and meaningful to show to the user, in Hebrew. */
export class UserFacingError extends Error {}

export type DemoRole = Role;
