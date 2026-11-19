import { ADVISOR_FUNCTION, createSupabase, MATERIALS_BUCKET } from '../lib/supabase';
import { strings } from '../content/strings';
import { UserFacingError, type Api, type AuthEvent } from './api';
import type {
  AdvisorReply, Gate, JournalEntry, JournalQuestion, MappingData, MappingStatement, Material, Me,
  NorthStarVersion, Role, Round, Session, Settings,
} from './types';

type Row = Record<string, any>;

const SETTING_KEYS: Record<keyof Settings, string> = {
  mappingPublished: 'mapping_published',
  mappingOpenQuestion: 'mapping_open_question',
  advisorEnabled: 'advisor_enabled',
  advisorOpeningMessage: 'advisor_opening_message',
  advisorSuggestedQuestions: 'advisor_suggested_questions',
};

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

const bySort = (a: Row, b: Row) => a.sort_order - b.sort_order;

export function createSupabaseApi(): Api {
  const supabase = createSupabase();
  const db = () => supabase;

  async function userId(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new UserFacingError(strings.errors.sessionExpired);
    return id;
  }

  return {
    onAuthChange(callback) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        const user = session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null;
        const authEvent: AuthEvent = { user, recovery: event === 'PASSWORD_RECOVERY' };
        // Supabase advises against calling its client synchronously inside this callback.
        setTimeout(() => callback(authEvent), 0);
      });
      return () => data.subscription.unsubscribe();
    },

    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) return;
      // 4xx: the credentials were refused. Anything else: the service could not be reached.
      const refused = typeof error.status === 'number' && error.status >= 400 && error.status < 500;
      throw new UserFacingError(refused ? strings.login.wrongCredentials : strings.login.unavailable);
    },

    async signOut() {
      await supabase.auth.signOut();
    },

    async requestPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
    },

    async updatePassword(password) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
    },

    async loadMe(id, email): Promise<Me> {
      const membership = check(
        await db().from('app_memberships').select('role').eq('user_id', id).eq('app', 'pisga').maybeSingle(),
      ) as Row | null;
      if (!membership) return { userId: id, email, displayName: '', role: null };
      const profile = check(
        await db().from('profiles').select('display_name').eq('user_id', id).maybeSingle(),
      ) as Row | null;
      return { userId: id, email, displayName: profile?.display_name ?? '', role: membership.role as Role };
    },

    async listGates(): Promise<Gate[]> {
      const rows = check(await db().from('gates').select('number, title').order('number')) as Row[];
      return rows.map((r) => ({ number: r.number, title: r.title }));
    },

    async listSessions(): Promise<Session[]> {
      const rows = check(
        await db().from('sessions').select('*, session_speakers(*), session_materials(*)').order('number'),
      ) as Row[];
      return rows.map((r) => ({
        number: r.number,
        title: r.title,
        date: r.session_date,
        location: r.location,
        gateNumber: r.gate_number,
        description: r.description,
        status: r.status,
        speakers: [...(r.session_speakers ?? [])]
          .sort(bySort)
          .map((s: Row) => ({ id: s.id, name: s.name, sortOrder: s.sort_order })),
        materials: [...(r.session_materials ?? [])].sort(bySort).map(
          (m: Row): Material => ({
            id: m.id,
            sessionNumber: m.session_number,
            title: m.title,
            storagePath: m.storage_path,
            fileExt: m.file_ext,
            sortOrder: m.sort_order,
          }),
        ),
      }));
    },

    async getSettings(): Promise<Settings> {
      const rows = check(await db().from('app_settings').select('key, value')) as Row[];
      const value = (key: string) => rows.find((r) => r.key === key)?.value;
      const questions = value(SETTING_KEYS.advisorSuggestedQuestions);
      return {
        mappingPublished: value(SETTING_KEYS.mappingPublished) === true,
        mappingOpenQuestion: String(value(SETTING_KEYS.mappingOpenQuestion) ?? ''),
        advisorEnabled: value(SETTING_KEYS.advisorEnabled) === true,
        advisorOpeningMessage: String(value(SETTING_KEYS.advisorOpeningMessage) ?? ''),
        advisorSuggestedQuestions: Array.isArray(questions) ? questions.map(String) : [],
      };
    },

    async listMappingStatements(): Promise<MappingStatement[]> {
      const rows = check(
        await db().from('mapping_statements').select('id, gate_number, sort_order, body').order('gate_number').order('sort_order'),
      ) as Row[];
      return rows.map((r) => ({ id: r.id, gateNumber: r.gate_number, sortOrder: r.sort_order, body: r.body }));
    },

    async getMaterialUrl(material) {
      const { data, error } = await supabase.storage.from(MATERIALS_BUCKET).createSignedUrl(material.storagePath, 120, {
        download: material.fileExt ? `${material.title}.${material.fileExt}` : material.title,
      });
      if (error || !data) throw new Error(error?.message ?? 'No signed URL');
      return data.signedUrl;
    },

    async getMapping(): Promise<MappingData> {
      const [responses, open, completions] = await Promise.all([
        db().from('mapping_responses').select('round, statement_id, score'),
        db().from('mapping_open_answers').select('round, body'),
        db().from('mapping_completions').select('round, completed_at'),
      ]);
      const data: MappingData = {
        responses: (check(responses) as Row[]).map((r) => ({ round: r.round, statementId: r.statement_id, score: r.score })),
        openAnswers: {},
        completedAt: {},
      };
      for (const r of check(open) as Row[]) data.openAnswers[r.round as Round] = r.body;
      for (const r of check(completions) as Row[]) data.completedAt[r.round as Round] = r.completed_at;
      return data;
    },

    async saveMappingResponse(round, statementId, score) {
      const user_id = await userId();
      check(
        await db()
          .from('mapping_responses')
          .upsert({ user_id, round, statement_id: statementId, score }, { onConflict: 'user_id,round,statement_id' }),
      );
    },

    async saveMappingOpenAnswer(round, body) {
      const user_id = await userId();
      check(await db().from('mapping_open_answers').upsert({ user_id, round, body }, { onConflict: 'user_id,round' }));
    },

    async completeMapping(round) {
      const user_id = await userId();
      check(await db().from('mapping_completions').insert({ user_id, round }));
    },

    async listJournalQuestions(): Promise<JournalQuestion[]> {
      const rows = check(
        await db().from('journal_questions').select('id, session_number, sort_order, body, kind').order('session_number').order('sort_order'),
      ) as Row[];
      return rows.map((r) => ({ id: r.id, sessionNumber: r.session_number, sortOrder: r.sort_order, body: r.body, kind: r.kind }));
    },

    async listJournalEntries(): Promise<JournalEntry[]> {
      const rows = check(await db().from('journal_entries').select('question_id, body')) as Row[];
      return rows.map((r) => ({ questionId: r.question_id, body: r.body }));
    },

    async saveJournalEntry(questionId, body) {
      const user_id = await userId();
      check(await db().from('journal_entries').upsert({ user_id, question_id: questionId, body }, { onConflict: 'user_id,question_id' }));
    },

    async listNorthStarVersions(): Promise<NorthStarVersion[]> {
      const rows = check(await db().from('north_star_versions').select('session_number, body').order('session_number')) as Row[];
      return rows.map((r) => ({ sessionNumber: r.session_number, body: r.body }));
    },

    async saveNorthStar(sessionNumber, body) {
      const user_id = await userId();
      check(
        await db()
          .from('north_star_versions')
          .upsert({ user_id, session_number: sessionNumber, body }, { onConflict: 'user_id,session_number' }),
      );
    },

    async askAdvisor(conversation): Promise<AdvisorReply> {
      const { data, error } = await supabase.functions.invoke(ADVISOR_FUNCTION, { body: { messages: conversation } });
      if (error || !data || typeof data.text !== 'string') throw new Error(error?.message ?? 'Advisor unavailable');
      return { text: data.text, sources: Array.isArray(data.sources) ? data.sources.map(String) : [] };
    },

    async saveSession(number, input) {
      check(
        await db()
          .from('sessions')
          .update({
            title: input.title,
            session_date: input.date,
            location: input.location,
            gate_number: input.gateNumber,
            description: input.description,
            status: input.status,
          })
          .eq('number', number),
      );
      check(await db().from('session_speakers').delete().eq('session_number', number));
      if (input.speakers.length) {
        check(
          await db()
            .from('session_speakers')
            .insert(input.speakers.map((name, i) => ({ session_number: number, name, sort_order: i }))),
        );
      }
    },

    async uploadMaterial(sessionNumber, title, file) {
      const ext = (file.name.includes('.') ? file.name.split('.').pop() ?? '' : '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const folder = `session-${String(sessionNumber).padStart(2, '0')}`;
      const path = `${folder}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`;
      const upload = await supabase.storage.from(MATERIALS_BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upload.error) throw new Error(upload.error.message);
      const insert = await db()
        .from('session_materials')
        .insert({ session_number: sessionNumber, title, storage_path: path, file_ext: ext || null, sort_order: Math.floor(Date.now() / 1000) % 32000 });
      if (insert.error) {
        await supabase.storage.from(MATERIALS_BUCKET).remove([path]);
        throw new Error(insert.error.message);
      }
    },

    async removeMaterial(material) {
      check(await db().from('session_materials').delete().eq('id', material.id));
      const { error } = await supabase.storage.from(MATERIALS_BUCKET).remove([material.storagePath]);
      if (error) throw new Error(error.message);
    },

    async saveMappingStatement(gateNumber, sortOrder, body) {
      check(
        await db()
          .from('mapping_statements')
          .upsert({ gate_number: gateNumber, sort_order: sortOrder, body }, { onConflict: 'gate_number,sort_order' }),
      );
    },

    async saveJournalQuestion(sessionNumber, sortOrder, body, kind) {
      check(
        await db()
          .from('journal_questions')
          .upsert({ session_number: sessionNumber, sort_order: sortOrder, body, kind }, { onConflict: 'session_number,sort_order' }),
      );
    },

    async removeJournalQuestion(id) {
      const { error } = await db().from('journal_questions').delete().eq('id', id);
      if (error) {
        // Foreign-key restriction: participants have already answered this question.
        if ((error as { code?: string }).code === '23503') throw new UserFacingError(strings.admin.questionHasAnswers);
        throw new Error(error.message);
      }
    },

    async saveSettings(patch) {
      const rows = (Object.keys(patch) as Array<keyof Settings>).map((k) => ({ key: SETTING_KEYS[k], value: patch[k] }));
      if (rows.length) check(await db().from('app_settings').upsert(rows, { onConflict: 'key' }));
    },
  };
}
