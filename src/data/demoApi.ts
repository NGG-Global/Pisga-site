/**
 * Demo backend: sample data held in this browser's localStorage. It exists so that the
 * interface can be reviewed without a Supabase project. It applies the same visibility rules
 * as the database policies (see supabase/migrations) but is NOT a security boundary.
 * Text in square brackets is placeholder content, following the design hand-off.
 */
import { isStationOpen } from '../lib/programme';
import { today } from '../lib/today';
import { strings } from '../content/strings';
import { UserFacingError, type Api, type AuthEvent } from './api';
import {
  isStaff,
  type Gate, type JournalEntry, type JournalQuestion, type MappingData, type MappingStatement,
  type NorthStarVersion, type Role, type Session, type Settings,
} from './types';

const STATE_KEY = 'pisga-demo-state-v1';
export const DEMO_ROLE_KEY = 'pisga-demo-role';

interface DemoState {
  user: { id: string; email: string } | null;
  gates: Gate[];
  sessions: Session[];
  settings: Settings;
  statements: MappingStatement[];
  questions: JournalQuestion[];
  mapping: MappingData;
  entries: JournalEntry[];
  northStar: NorthStarVersion[];
}

const GATE_TITLES = [
  'זהות מנהיגותית לעתיד', 'ראייה מערכתית 2035', 'מנהיגות רבודה (בעידן ה־AI)', 'ניווט באי־ודאות',
  'עיצוב מחדש', 'השפעה ורישות', 'כישורי העתיד',
];

const uid = () => crypto.randomUUID();

function seed(): DemoState {
  const gates = GATE_TITLES.map((title, i) => ({ number: i + 1, title }));
  const sessions: Session[] = Array.from({ length: 12 }, (_, i) => ({
    number: i + 1,
    title: null,
    date: null,
    location: null,
    gateNumber: null,
    description: null,
    status: 'scheduled' as const,
    speakers: [],
    materials: [],
  }));
  Object.assign(sessions[0], { title: 'Leaving Gravity', date: '2026-12-30', gateNumber: 1 });
  sessions[0].materials = [
    { id: uid(), sessionNumber: 1, title: '[שם המסמך]', storagePath: 'demo/1.pdf', fileExt: 'pdf', sortOrder: 0 },
    { id: uid(), sessionNumber: 1, title: '[מצגת המפגש]', storagePath: 'demo/2.pptx', fileExt: 'pptx', sortOrder: 1 },
  ];
  Object.assign(sessions[1], { title: 'Leaving Gravity · ODT', gateNumber: 1 });

  const statements: MappingStatement[] = gates.flatMap((g) =>
    [1, 2].map((order) => ({
      id: uid(),
      gateNumber: g.number,
      sortOrder: order,
      body: `[היגד ${order} של שער ${String(g.number).padStart(2, '0')}]`,
    })),
  );
  statements[0].body = 'אני מאתגר/ת ומעדכן/ת את דרכי ההובלה שלי בהתאם לראייה עתידית.';
  statements[1].body = 'אני מעצב/ת את הזהות המנהיגותית שלי לנוכח אתגרי העתיד, ולא רק לנוכח התפקיד הנוכחי.';

  const questions: JournalQuestion[] = [1, 2].flatMap((sessionNumber) => [
    { id: uid(), sessionNumber, sortOrder: 1, body: '[שאלת רפלקציה 1]', kind: 'open' as const },
    { id: uid(), sessionNumber, sortOrder: 2, body: '[שאלת רפלקציה 2]', kind: 'open' as const },
    { id: uid(), sessionNumber, sortOrder: 3, body: '[שאלת כוכב הצפון]', kind: 'north_star' as const },
  ]);

  return {
    user: null,
    gates,
    sessions,
    settings: {
      mappingPublished: true,
      mappingOpenQuestion: '[השאלה הפתוחה של המיפוי]',
      advisorEnabled: true,
      advisorOpeningMessage: '[הודעת פתיחה: מה היועץ יודע ובמה אפשר להתייעץ איתו]',
      advisorSuggestedQuestions: ['[שאלה מוצעת 1]', '[שאלה מוצעת 2]', '[שאלה מוצעת 3]'],
    },
    statements,
    questions,
    mapping: { responses: [], openAnswers: {}, completedAt: {} },
    entries: [],
    northStar: [],
  };
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw) as DemoState;
  } catch {
    /* fall through to a fresh state */
  }
  return seed();
}

export function demoRole(): Role {
  try {
    const role = localStorage.getItem(DEMO_ROLE_KEY) as Role | null;
    if (role && role in strings.roles) return role;
  } catch {
    /* ignore */
  }
  return 'participant';
}

export function resetDemo(): void {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch {
    /* ignore */
  }
}

const pause = (ms = 120) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createDemoApi(): Api {
  let state = load();
  const listeners = new Set<(event: AuthEvent) => void>();

  const persist = () => {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable: the demo continues in memory */
    }
  };
  const emit = () => listeners.forEach((l) => l({ user: state.user, recovery: false }));
  const requireStaff = () => {
    if (!isStaff(demoRole())) throw new Error('Demo: staff role required');
  };
  const requireParticipant = () => {
    if (demoRole() !== 'participant') throw new Error('Demo: participant role required');
  };
  const sessionOpen = (n: number) => {
    const s = state.sessions.find((x) => x.number === n);
    return !!s && isStationOpen(s, today());
  };
  const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

  return {
    onAuthChange(callback) {
      listeners.add(callback);
      setTimeout(() => callback({ user: state.user, recovery: false }), 0);
      return () => listeners.delete(callback);
    },
    async signIn(email) {
      await pause(300);
      state = load();
      state.user = { id: 'demo-user', email: email || 'demo@example.com' };
      persist();
      emit();
    },
    async signOut() {
      state.user = null;
      persist();
      emit();
    },
    async requestPasswordReset() {
      await pause(300);
    },
    async updatePassword() {
      await pause(300);
    },
    async loadMe(userId, email) {
      await pause();
      const role = demoRole();
      return { userId, email, displayName: role === 'participant' ? '[שם המשתתף/ת]' : strings.roles[role], role };
    },

    async listGates() {
      await pause();
      return copy(state.gates);
    },
    async listSessions() {
      await pause();
      return copy(state.sessions);
    },
    async getSettings() {
      await pause();
      return copy(state.settings);
    },
    async listMappingStatements() {
      await pause();
      return copy(state.statements);
    },
    async getMaterialUrl() {
      return URL.createObjectURL(new Blob([strings.demo.file], { type: 'text/plain;charset=utf-8' }));
    },

    async getMapping() {
      await pause();
      return demoRole() === 'participant' ? copy(state.mapping) : { responses: [], openAnswers: {}, completedAt: {} };
    },
    async saveMappingResponse(round, statementId, score) {
      await pause();
      requireParticipant();
      if (state.mapping.completedAt[round]) throw new UserFacingError(strings.common.saveFailed);
      state.mapping.responses = state.mapping.responses.filter((r) => !(r.round === round && r.statementId === statementId));
      state.mapping.responses.push({ round, statementId, score });
      persist();
    },
    async saveMappingOpenAnswer(round, body) {
      await pause();
      requireParticipant();
      if (state.mapping.completedAt[round]) throw new UserFacingError(strings.common.saveFailed);
      state.mapping.openAnswers[round] = body;
      persist();
    },
    async completeMapping(round) {
      await pause();
      requireParticipant();
      const answered = state.mapping.responses.filter((r) => r.round === round).length;
      if (answered < state.statements.length) throw new UserFacingError(strings.common.saveFailed);
      state.mapping.completedAt[round] = new Date().toISOString();
      persist();
    },
    async listJournalQuestions() {
      await pause();
      const role = demoRole();
      if (isStaff(role)) return copy(state.questions);
      if (role !== 'participant') return [];
      return copy(state.questions.filter((q) => sessionOpen(q.sessionNumber)));
    },
    async listJournalEntries() {
      await pause();
      return demoRole() === 'participant' ? copy(state.entries) : [];
    },
    async saveJournalEntry(questionId, body) {
      await pause();
      requireParticipant();
      const question = state.questions.find((q) => q.id === questionId);
      if (!question || !sessionOpen(question.sessionNumber)) throw new UserFacingError(strings.common.saveFailed);
      state.entries = state.entries.filter((e) => e.questionId !== questionId);
      state.entries.push({ questionId, body });
      persist();
    },
    async listNorthStarVersions() {
      await pause();
      return demoRole() === 'participant' ? copy(state.northStar).sort((a, b) => a.sessionNumber - b.sessionNumber) : [];
    },
    async saveNorthStar(sessionNumber, body) {
      await pause();
      requireParticipant();
      if (!sessionOpen(sessionNumber)) throw new UserFacingError(strings.common.saveFailed);
      state.northStar = state.northStar.filter((v) => v.sessionNumber !== sessionNumber);
      state.northStar.push({ sessionNumber, body });
      persist();
    },
    async askAdvisor() {
      await pause(1500);
      return { text: '[תשובת היועץ, מבוססת על תכני התוכנית]', sources: ['[שם המאמר / מפגש 01]'] };
    },

    async saveSession(number, input) {
      await pause();
      requireStaff();
      const session = state.sessions.find((s) => s.number === number);
      if (!session) throw new Error('Demo: unknown session');
      Object.assign(session, {
        title: input.title,
        date: input.date,
        location: input.location,
        gateNumber: input.gateNumber,
        description: input.description,
        status: input.status,
        speakers: input.speakers.map((name, i) => ({ id: uid(), name, sortOrder: i })),
      });
      persist();
    },
    async uploadMaterial(sessionNumber, title, file) {
      await pause(400);
      requireStaff();
      const session = state.sessions.find((s) => s.number === sessionNumber);
      if (!session) throw new Error('Demo: unknown session');
      const ext = file.name.includes('.') ? (file.name.split('.').pop() ?? '').toLowerCase() : '';
      session.materials.push({
        id: uid(), sessionNumber, title, storagePath: `demo/${uid()}`, fileExt: ext || null, sortOrder: session.materials.length,
      });
      persist();
    },
    async removeMaterial(material) {
      await pause();
      requireStaff();
      const session = state.sessions.find((s) => s.number === material.sessionNumber);
      if (session) session.materials = session.materials.filter((m) => m.id !== material.id);
      persist();
    },
    async saveMappingStatement(gateNumber, sortOrder, body) {
      await pause();
      requireStaff();
      const existing = state.statements.find((s) => s.gateNumber === gateNumber && s.sortOrder === sortOrder);
      if (existing) existing.body = body;
      else state.statements.push({ id: uid(), gateNumber, sortOrder, body });
      persist();
    },
    async saveJournalQuestion(sessionNumber, sortOrder, body, kind) {
      await pause();
      requireStaff();
      const existing = state.questions.find((q) => q.sessionNumber === sessionNumber && q.sortOrder === sortOrder);
      if (existing) Object.assign(existing, { body, kind });
      else state.questions.push({ id: uid(), sessionNumber, sortOrder, body, kind });
      persist();
    },
    async removeJournalQuestion(id) {
      await pause();
      requireStaff();
      if (state.entries.some((e) => e.questionId === id)) throw new UserFacingError(strings.admin.questionHasAnswers);
      state.questions = state.questions.filter((q) => q.id !== id);
      persist();
    },
    async saveSettings(patch) {
      await pause();
      requireStaff();
      state.settings = { ...state.settings, ...patch };
      persist();
    },
  };
}
