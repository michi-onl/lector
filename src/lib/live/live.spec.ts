import { CALIBRATION_TEXTS } from '#lib/calibration/texts.js';
import { describe, expect, it } from 'vitest';
import {
	advance,
	CODE_LENGTH,
	generateCode,
	liveRounds,
	normalizeCode,
	parseSpeeds,
	revealed,
	summarize
} from './live.js';

describe('codes', () => {
	it('avoid look-alike characters', () => {
		const code = generateCode();
		expect(code).toHaveLength(CODE_LENGTH);
		expect(code).not.toMatch(/[01ILO]/u);
	});

	it('ignore case and spacing when typed', () => {
		expect(normalizeCode(' k7q-2m ')).toBe('K7Q2M');
	});
});

describe('parseSpeeds', () => {
	it('reads one to four speeds in range', () => {
		expect(parseSpeeds('300, 600')).toEqual([300, 600]);
		expect(parseSpeeds('250 450 650 850')).toEqual([250, 450, 650, 850]);
		expect(parseSpeeds('')).toBeNull();
		expect(parseSpeeds('300, 400, 500, 600, 700')).toBeNull();
		expect(parseSpeeds('50')).toBeNull();
		expect(parseSpeeds('300, schnell')).toBeNull();
	});
});

describe('advance', () => {
	it('walks the rounds and ends after the last results', () => {
		let state = { phase: 'lobby' as const, round: 0 } as ReturnType<typeof advance>;
		const phases: string[] = [];
		for (let step = 0; step < 8; step++) {
			state = advance(state.phase, state.round, 2);
			phases.push(`${state.phase}:${state.round}`);
		}
		expect(phases).toEqual([
			'reading:0',
			'questions:0',
			'results:0',
			'reading:1',
			'questions:1',
			'results:1',
			'finished:1',
			'finished:1'
		]);
	});
});

describe('revealed', () => {
	it('shows a round once its results are out', () => {
		expect(revealed('questions', 0, 0)).toBe(false);
		expect(revealed('results', 0, 0)).toBe(true);
		expect(revealed('reading', 0, 1)).toBe(true);
		expect(revealed('reading', 1, 1)).toBe(false);
	});
});

describe('summarize', () => {
	it('counts right answers, people and those who understood everything', () => {
		const rounds = liveRounds([300, 600]);
		const answer = (participantId: string, round: number, question: number, correct: boolean) => ({
			participantId,
			round,
			question,
			correct
		});
		const [first] = summarize(
			rounds,
			[
				answer('a', 0, 0, true),
				answer('a', 0, 1, true),
				answer('b', 0, 0, true),
				answer('b', 0, 1, false),
				answer('a', 1, 0, false)
			],
			0
		);
		expect(first).toMatchObject({
			wpm: 300,
			title: CALIBRATION_TEXTS[0].title,
			participants: 2,
			answers: 4,
			share: 0.75,
			understood: 1
		});
		expect(first.questions.map((question) => question.share)).toEqual([1, 0.5]);
	});

	it('reports rounds without answers as empty', () => {
		const [round] = summarize(liveRounds([300]), [], 0);
		expect(round).toMatchObject({ participants: 0, answers: 0, share: 0 });
	});
});
