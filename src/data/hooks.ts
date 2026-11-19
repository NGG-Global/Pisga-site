import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './index';
import type { QuestionKind, Round, SessionInput, Settings, Material } from './types';

export const keys = {
  gates: ['gates'] as const,
  sessions: ['sessions'] as const,
  settings: ['settings'] as const,
  statements: ['statements'] as const,
  mapping: ['mapping'] as const,
  questions: ['journal-questions'] as const,
  entries: ['journal-entries'] as const,
  northStar: ['north-star'] as const,
};

export const useGates = () => useQuery({ queryKey: keys.gates, queryFn: () => api().listGates(), staleTime: Infinity });
export const useSessions = () => useQuery({ queryKey: keys.sessions, queryFn: () => api().listSessions() });
export const useSettings = () => useQuery({ queryKey: keys.settings, queryFn: () => api().getSettings() });
export const useStatements = () => useQuery({ queryKey: keys.statements, queryFn: () => api().listMappingStatements() });
export const useMapping = (enabled = true) =>
  useQuery({ queryKey: keys.mapping, queryFn: () => api().getMapping(), enabled });
export const useJournalQuestions = (enabled = true) =>
  useQuery({ queryKey: keys.questions, queryFn: () => api().listJournalQuestions(), enabled });
export const useJournalEntries = (enabled = true) =>
  useQuery({ queryKey: keys.entries, queryFn: () => api().listJournalEntries(), enabled });
export const useNorthStar = (enabled = true) =>
  useQuery({ queryKey: keys.northStar, queryFn: () => api().listNorthStarVersions(), enabled });

function useInvalidating<TArgs>(fn: (args: TArgs) => Promise<void>, invalidate: ReadonlyArray<readonly string[]>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => Promise.all(invalidate.map((queryKey) => client.invalidateQueries({ queryKey }))),
  });
}

export const useSaveMappingResponse = () =>
  useInvalidating((a: { round: Round; statementId: string; score: number }) => api().saveMappingResponse(a.round, a.statementId, a.score), [keys.mapping]);
export const useSaveMappingOpenAnswer = () =>
  useInvalidating((a: { round: Round; body: string }) => api().saveMappingOpenAnswer(a.round, a.body), [keys.mapping]);
export const useCompleteMapping = () =>
  useInvalidating((round: Round) => api().completeMapping(round), [keys.mapping]);
export const useSaveJournalEntry = () =>
  useInvalidating((a: { questionId: string; body: string }) => api().saveJournalEntry(a.questionId, a.body), [keys.entries]);
export const useSaveNorthStar = () =>
  useInvalidating((a: { sessionNumber: number; body: string }) => api().saveNorthStar(a.sessionNumber, a.body), [keys.northStar]);

export const useSaveSession = () =>
  useInvalidating((a: { number: number; input: SessionInput }) => api().saveSession(a.number, a.input), [keys.sessions]);
export const useUploadMaterial = () =>
  useInvalidating((a: { sessionNumber: number; title: string; file: File }) => api().uploadMaterial(a.sessionNumber, a.title, a.file), [keys.sessions]);
export const useRemoveMaterial = () =>
  useInvalidating((material: Material) => api().removeMaterial(material), [keys.sessions]);
export const useSaveStatement = () =>
  useInvalidating((a: { gateNumber: number; sortOrder: number; body: string }) => api().saveMappingStatement(a.gateNumber, a.sortOrder, a.body), [keys.statements]);
export const useSaveQuestion = () =>
  useInvalidating((a: { sessionNumber: number; sortOrder: number; body: string; kind: QuestionKind }) => api().saveJournalQuestion(a.sessionNumber, a.sortOrder, a.body, a.kind), [keys.questions]);
export const useRemoveQuestion = () =>
  useInvalidating((id: string) => api().removeJournalQuestion(id), [keys.questions]);
export const useSaveSettings = () =>
  useInvalidating((patch: Partial<Settings>) => api().saveSettings(patch), [keys.settings]);
