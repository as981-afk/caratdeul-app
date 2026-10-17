// Per-profile quiz history, one record per quiz (latest attempt wins).
//
// Storage shape (key `caratflix-quiz-<profileId>`):
//
//     { "<quizId>": { kind, at, ...result } }
//
// The result shape is quiz-specific:
//   member → { kind: "member", memberName, scores }
//   song   → { kind: "song", score, total }

import { loadList, saveList } from "../hooks/useLocalStorageList";
import { notifyEngagement } from "./engagementEvents";

export const QUIZ_KEY = "caratflix-quiz";

export function quizKeyFor(profileId) {
  return `${QUIZ_KEY}-${profileId}`;
}

export function loadQuizResults(profileId) {
  if (!profileId) return {};
  const value = loadList(quizKeyFor(profileId), () => ({}));
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function saveQuizResult(profileId, quizId, result) {
  if (!profileId || !quizId) return;
  const map = loadQuizResults(profileId);
  saveList(quizKeyFor(profileId), { ...map, [quizId]: { ...result, at: Date.now() } });
  notifyEngagement();
}
