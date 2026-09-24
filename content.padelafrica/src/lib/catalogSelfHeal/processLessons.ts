/**
 * File-backed process lessons — job residue the system should remember (not listing About).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { processLessonId, type ProcessLesson, type ProcessLessonKind } from "./types";

export const DEFAULT_PROCESS_LESSONS_PATH = resolve(
  "scripts/data/padel-africa-process-lessons.json",
);

type FileShape = { version: 1; lessons: ProcessLesson[] };

export function loadProcessLessons(path = DEFAULT_PROCESS_LESSONS_PATH): ProcessLesson[] {
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as FileShape | ProcessLesson[];
    if (Array.isArray(raw)) return raw;
    return Array.isArray(raw.lessons) ? raw.lessons : [];
  } catch {
    return [];
  }
}

export function saveProcessLessons(lessons: ProcessLesson[], path = DEFAULT_PROCESS_LESSONS_PATH): void {
  mkdirSync(dirname(path), { recursive: true });
  const body: FileShape = { version: 1, lessons: lessons.slice(0, 500) };
  writeFileSync(path, `${JSON.stringify(body, null, 2)}\n`, "utf8");
}

export function recordProcessLesson(
  input: {
    job: string;
    kind: ProcessLessonKind;
    message: string;
    evidence?: string[];
    key?: string;
    at?: string;
  },
  path = DEFAULT_PROCESS_LESSONS_PATH,
): ProcessLesson {
  const createdAt = input.at ?? new Date().toISOString();
  const key = input.key ?? `${input.message}|${createdAt.slice(0, 10)}`;
  const lesson: ProcessLesson = {
    id: processLessonId(input.job, input.kind, key),
    job: input.job,
    kind: input.kind,
    message: input.message.slice(0, 500),
    evidence: (input.evidence ?? []).slice(0, 12),
    createdAt,
  };
  const existing = loadProcessLessons(path);
  if (existing.some((l) => l.id === lesson.id)) return lesson;
  existing.unshift(lesson);
  saveProcessLessons(existing, path);
  return lesson;
}
