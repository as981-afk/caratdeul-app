// CaratFlix engagement quizzes. Everything here is local-only and text-based:
// no audio clips, no copyrighted lyrics — the "Guess the song" clues describe
// each track (year, album, concept) instead of quoting it.
//
// Two quiz shapes share one runner (see components/QuizPage.jsx):
//
//   member  — "Which member are you?"  Each option carries `weights`, a map of
//             member name -> points; the member with the highest total wins.
//   song    — "Guess the song"         Each question has 4 options and a single
//             `answer` index; the score is correct answers out of total.
//
// Scoring lives here (not in the component) so it stays pure and testable.

import { MEMBERS } from "./MEMBERS";

export const MEMBER_QUIZ = {
  id: "member",
  kind: "member",
  emoji: "💎",
  title: "Which member are you?",
  subtitle: "Six questions. One SEVENTEEN soul.",
  intro: "Answer honestly — the diamond life knows.",
  questions: [
    {
      q: "It's a free Saturday. How do you spend it?",
      options: [
        { label: "Grinding a video game until sunrise", weights: { Wonwoo: 2, Vernon: 1 } },
        { label: "Cooking a huge meal for everyone", weights: { Mingyu: 2, DK: 1 } },
        { label: "Dancing in front of the mirror", weights: { Hoshi: 2, Dino: 1 } },
        { label: "Napping, then pranking my friends", weights: { Jeonghan: 2, Jun: 1 } },
      ],
    },
    {
      q: "What's your role in the friend group?",
      options: [
        { label: "The leader who organises everything", weights: { "S.Coups": 2, Woozi: 1 } },
        { label: "The mood-maker who never stops laughing", weights: { DK: 2, Seungkwan: 1 } },
        { label: "The calm one everybody vents to", weights: { Joshua: 2, Wonwoo: 1 } },
        { label: "The wild card who does what they want", weights: { Minghao: 2, Vernon: 1 } },
      ],
    },
    {
      q: "Pick a dream vacation:",
      options: [
        { label: "An exhaustive Italy food tour", weights: { Mingyu: 2, Joshua: 1 } },
        { label: "Beach days with a city-pop playlist", weights: { DK: 2, Seungkwan: 1 } },
        { label: "Art galleries, tea, and quiet streets", weights: { Minghao: 2, Jun: 1 } },
        { label: "Adrenaline sports and late nights", weights: { Dino: 2, Hoshi: 1 } },
      ],
    },
    {
      q: "Your go-to outfit?",
      options: [
        { label: "All black, effortlessly cool", weights: { Vernon: 2, "S.Coups": 1 } },
        { label: "Bright colours and loud prints", weights: { Hoshi: 2, DK: 1 } },
        { label: "Soft pastels and cosy knits", weights: { Jeonghan: 2, Joshua: 1 } },
        { label: "Vintage and retro finds", weights: { Woozi: 2, Minghao: 1 } },
      ],
    },
    {
      q: "What gets you out of bed in the morning?",
      options: [
        { label: "A new challenge to master", weights: { Woozi: 2, Dino: 1 } },
        { label: "The chaotic group chat", weights: { Seungkwan: 2, DK: 1 } },
        { label: "Coffee and my favourite playlist", weights: { Wonwoo: 2, Jun: 1 } },
        { label: "The dream I'm chasing", weights: { Hoshi: 2, "S.Coups": 1 } },
      ],
    },
    {
      q: "Your hidden talent?",
      options: [
        { label: "Cooking for a crowd", weights: { Mingyu: 2, DK: 1 } },
        { label: "Impressions and comedy bits", weights: { Seungkwan: 2, Jeonghan: 1 } },
        { label: "Reading the room instantly", weights: { Minghao: 2, Joshua: 1 } },
        { label: "Never losing a single game", weights: { Wonwoo: 2, Vernon: 1 } },
      ],
    },
  ],
};

export const SONG_QUIZ = {
  id: "song",
  kind: "song",
  emoji: "🎵",
  title: "Guess the song",
  subtitle: "Six clues. Four options each.",
  intro: "No audio — read the clue and pick the SEVENTEEN track.",
  questions: [
    {
      clue: "A 2022 anthem about facing your fears head-on, with famously fierce choreography.",
      options: ["HOT", "Super", "_World", "Cheers"],
      answer: 0,
    },
    {
      clue: "A 2023 epic inspired by Chinese mythology, from the album FML.",
      options: ["Super", "Maestro", "God of Music", "THUNDER"],
      answer: 0,
    },
    {
      clue: "Their 2016 breakout hit, famous for the 'Aju Nice!' chorus and alarm-clock choreography.",
      options: ["Pretty U", "Very Nice", "Boom Boom", "Ah! Love"],
      answer: 1,
    },
    {
      clue: "A 2021 high-octane pop-punk title track from the album ATTACCA.",
      options: ["Ready to Love", "Rock with You", "Anyone", "To You"],
      answer: 1,
    },
    {
      clue: "A 2024 orchestral pop title track with a conductor concept, from 17 IS RIGHT HERE.",
      options: ["Maestro", "Spell", "Love, Money, Fame", "Lalali"],
      answer: 0,
    },
    {
      clue: "A joyful 2023 Greek-mythology anthem from the album SEVENTEENTH HEAVEN.",
      options: ["God of Music", "Diamond Days", "Silver Platter", "Sunday Dress"],
      answer: 0,
    },
  ],
};

export const QUIZZES = [MEMBER_QUIZ, SONG_QUIZ];

export function getQuiz(id) {
  return QUIZZES.find((quiz) => quiz.id === id) || null;
}

// Highest cumulative weight wins; ties break on the canonical member order so
// the result is deterministic. Returns { memberName, member, scores }.
export function scoreMemberQuiz(quiz, answers) {
  const scores = new Map();
  quiz.questions.forEach((question, i) => {
    const choice = question.options[answers[i]];
    if (!choice) return;
    for (const [name, points] of Object.entries(choice.weights)) {
      scores.set(name, (scores.get(name) || 0) + points);
    }
  });

  let winner = null;
  let best = -1;
  for (const member of MEMBERS) {
    const value = scores.get(member.name) || 0;
    if (value > best) {
      best = value;
      winner = member;
    }
  }
  return { memberName: winner?.name || MEMBERS[0].name, member: winner || MEMBERS[0], scores };
}

export function scoreSongQuiz(quiz, answers) {
  let score = 0;
  quiz.questions.forEach((question, i) => {
    if (answers[i] === question.answer) score += 1;
  });
  return { score, total: quiz.questions.length };
}
