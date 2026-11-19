import { describe, expect, it } from 'vitest';
import type { Gate, MappingResponse, MappingStatement, Session } from '../../data/types';
import { daysBetween, formatDate, formatDayMonth, todayInIsrael } from '../dates';
import {
  completedCount, daysUntil, formatAverage, gateAverages, isEndRoundOpen, isQuestionnaireComplete,
  isSessionCompleted, isStationOpen, nextSession,
} from '../programme';

const session = (number: number, date: string | null, status: Session['status'] = 'scheduled'): Session => ({
  number, title: null, date, location: null, gateNumber: null, description: null, status, speakers: [], materials: [],
});
const gates: Gate[] = Array.from({ length: 7 }, (_, i) => ({ number: i + 1, title: `gate ${i + 1}` }));
const statements: MappingStatement[] = gates.flatMap((g) =>
  [1, 2].map((o) => ({ id: `${g.number}.${o}`, gateNumber: g.number, sortOrder: o, body: 'text' })),
);

describe('dates', () => {
  it('reads today as the calendar date in Israel', () => {
    // 22:30 UTC on 29 December is already 30 December in Israel (UTC+2 in winter).
    expect(todayInIsrael(new Date('2026-12-29T22:30:00Z'))).toBe('2026-12-30');
    expect(todayInIsrael(new Date('2026-12-29T21:30:00Z'))).toBe('2026-12-29');
  });
  it('counts whole days and formats dates left to right', () => {
    expect(daysBetween('2026-11-19', '2026-12-30')).toBe(41);
    expect(daysBetween('2026-12-30', '2026-12-29')).toBe(-1);
    expect(formatDate('2026-12-30')).toBe('30.12.2026');
    expect(formatDayMonth('2026-12-30')).toBe('30.12');
  });
});

describe('session status', () => {
  const sessions = [session(1, '2026-12-30'), session(2, '2027-01-20'), session(3, null)];

  it('treats a session as completed the day after its date, or when staff mark it', () => {
    expect(isSessionCompleted(sessions[0], '2026-12-30')).toBe(false);
    expect(isSessionCompleted(sessions[0], '2026-12-31')).toBe(true);
    expect(isSessionCompleted(session(3, null, 'completed'), '2026-01-01')).toBe(true);
    expect(isSessionCompleted(session(3, null), '2030-01-01')).toBe(false);
  });
  it('finds the next session and the days remaining', () => {
    expect(nextSession(sessions, '2026-11-19')?.number).toBe(1);
    expect(daysUntil(sessions[0], '2026-11-19')).toBe(41);
    expect(daysUntil(sessions[0], '2026-12-30')).toBe(0);
    expect(nextSession(sessions, '2026-12-31')?.number).toBe(2);
    expect(nextSession(sessions, '2027-01-21')?.number).toBe(3);
    expect(daysUntil(sessions[2], '2027-01-21')).toBeNull();
    expect(completedCount(sessions, '2027-01-21')).toBe(2);
    expect(nextSession([session(1, '2026-12-30')], '2027-01-01')).toBeNull();
  });
  it('opens a journal station on the session date and not before', () => {
    expect(isStationOpen(sessions[0], '2026-12-29')).toBe(false);
    expect(isStationOpen(sessions[0], '2026-12-30')).toBe(true);
    expect(isStationOpen(sessions[2], '2030-01-01')).toBe(false);
  });
  it('opens the closing round of the mapping on the date of session 12', () => {
    const all = [session(1, '2026-12-30'), session(12, '2027-06-16')];
    expect(isEndRoundOpen(all, '2027-06-15')).toBe(false);
    expect(isEndRoundOpen(all, '2027-06-16')).toBe(true);
    expect(isEndRoundOpen([session(12, null)], '2027-06-16')).toBe(false);
  });
});

describe('mapping questionnaire', () => {
  it('is complete only with two statements per gate and the open question', () => {
    expect(isQuestionnaireComplete(statements, gates, 'question')).toBe(true);
    expect(isQuestionnaireComplete(statements, gates, '  ')).toBe(false);
    expect(isQuestionnaireComplete(statements.slice(0, 13), gates, 'question')).toBe(false);
    expect(isQuestionnaireComplete(statements.slice(0, 2), gates, 'question')).toBe(false);
  });
  it('averages the two statements of each gate, per round', () => {
    const responses: MappingResponse[] = [
      { round: 'start', statementId: '1.1', score: 3 },
      { round: 'start', statementId: '1.2', score: 4 },
      { round: 'start', statementId: '2.1', score: 5 },
      { round: 'end', statementId: '1.1', score: 5 },
    ];
    const start = gateAverages(gates, statements, responses, 'start');
    expect(start[0].average).toBe(3.5);
    expect(start[1].average).toBe(5);
    expect(start[2].average).toBeNull();
    expect(gateAverages(gates, statements, responses, 'end')[0].average).toBe(5);
    expect(formatAverage(3.5)).toBe('3.5');
    expect(formatAverage(4)).toBe('4.0');
    expect(formatAverage(null)).toBe('–');
  });
});
