import { daysBetween } from './dates';
import type { Gate, MappingResponse, MappingStatement, Round, Session } from '../data/types';

export const TOTAL_SESSIONS = 12;
export const STATEMENTS_PER_GATE = 2;
export const TOTAL_GATES = 7;
export const MAX_QUESTIONS_PER_SESSION = 4;
export const LAST_SESSION = 12;

/** A session is completed when staff marked it so, or when its date has passed. */
export function isSessionCompleted(session: Session, today: string): boolean {
  if (session.status === 'completed') return true;
  return session.date !== null && daysBetween(session.date, today) > 0;
}

export function completedCount(sessions: Session[], today: string): number {
  return sessions.filter((s) => isSessionCompleted(s, today)).length;
}

/**
 * The next session is the lowest-numbered session that is not completed.
 * Its date may still be undetermined.
 */
export function nextSession(sessions: Session[], today: string): Session | null {
  const open = sessions.filter((s) => !isSessionCompleted(s, today)).sort((a, b) => a.number - b.number);
  return open[0] ?? null;
}

/** Days until a dated session; null when the date is not set. Never negative. */
export function daysUntil(session: Session, today: string): number | null {
  if (session.date === null) return null;
  return Math.max(0, daysBetween(today, session.date));
}

/** A journal station opens on the date of its session. */
export function isStationOpen(session: Session, today: string): boolean {
  return session.date !== null && daysBetween(session.date, today) >= 0;
}

export function sortStatements(statements: MappingStatement[]): MappingStatement[] {
  return [...statements].sort((a, b) => a.gateNumber - b.gateNumber || a.sortOrder - b.sortOrder);
}

/** The questionnaire is ready for participants only when all 14 statements and the open question exist. */
export function isQuestionnaireComplete(statements: MappingStatement[], gates: Gate[], openQuestion: string): boolean {
  if (gates.length !== TOTAL_GATES || openQuestion.trim() === '') return false;
  return gates.every(
    (g) => statements.filter((s) => s.gateNumber === g.number && s.body.trim() !== '').length === STATEMENTS_PER_GATE,
  );
}

export interface GateAverage {
  gate: Gate;
  /** Mean score 1 to 5, or null when the gate has no answers in this round. */
  average: number | null;
}

export function gateAverages(
  gates: Gate[],
  statements: MappingStatement[],
  responses: MappingResponse[],
  round: Round,
): GateAverage[] {
  const byStatement = new Map(responses.filter((r) => r.round === round).map((r) => [r.statementId, r.score]));
  return [...gates]
    .sort((a, b) => a.number - b.number)
    .map((gate) => {
      const scores = statements
        .filter((s) => s.gateNumber === gate.number)
        .map((s) => byStatement.get(s.id))
        .filter((v): v is number => v !== undefined);
      const average = scores.length ? scores.reduce((sum, v) => sum + v, 0) / scores.length : null;
      return { gate, average };
    });
}

export function formatAverage(value: number | null): string {
  return value === null ? '–' : value.toFixed(1);
}

/** The closing round of the mapping opens on the date of the last session. */
export function isEndRoundOpen(sessions: Session[], today: string): boolean {
  const last = sessions.find((s) => s.number === LAST_SESSION);
  return !!last && isStationOpen(last, today);
}
