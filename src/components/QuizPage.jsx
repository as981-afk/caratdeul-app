import { useCallback, useMemo, useState } from "react";
import { QUIZZES, getQuiz, scoreMemberQuiz, scoreSongQuiz } from "../data/QUIZZES";
import { useSessionIdentity } from "../context/SessionContext.jsx";
import { useTheme } from "../ThemeContext";
import { getAccent } from "../data/AVATARS";
import { loadQuizResults, saveQuizResult } from "../utils/quizStore";
import ResultCard from "./ResultCard";
import "./QuizPage.css";

// Full-page quizzes view (`?view=quizzes`).
//
// One runner drives both quiz kinds (see data/QUIZZES.js): "Which member are
// you?" scores weights into a member, "Guess the song" counts correct answers.
// Attempts are written per profile (utils/quizStore.js) so the menu can show the
// last result and the badge engine can unlock "Quiz Master".
export function QuizPage({ onClose }) {
  const { profileId } = useSessionIdentity();
  const { accent } = useTheme();
  const accentInfo = useMemo(() => getAccent(accent) || {}, [accent]);

  const [activeId, setActiveId] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);

  // Cheap local read, re-run on every render, so the menu always reflects the
  // latest saved attempt.
  const saved = loadQuizResults(profileId);

  const quiz = activeId ? getQuiz(activeId) : null;

  const scrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const startQuiz = useCallback(
    (id) => {
      setActiveId(id);
      setStep(0);
      setAnswers([]);
      setResult(null);
      scrollTop();
    },
    [scrollTop]
  );

  const backToMenu = useCallback(() => {
    setActiveId(null);
    setResult(null);
    scrollTop();
  }, [scrollTop]);

  // Records the attempt and builds the shareable card descriptor.
  const finish = useCallback(
    (finishedQuiz, finalAnswers) => {
      let payload;
      let card;
      let caption;

      if (finishedQuiz.kind === "member") {
        const { memberName, member } = scoreMemberQuiz(finishedQuiz, finalAnswers);
        payload = { kind: "member", memberName };
        card = {
          slug: `caratflix-member-${memberName.replace(/\s+/g, "-").toLowerCase()}`,
          emoji: "💎",
          kicker: finishedQuiz.title,
          title: "Your SEVENTEEN match",
          big: `You're ${memberName}`,
          subtitle: member.unit,
          lines: [member.fullName, member.position, `${member.mbti} · ${member.hometown}`],
          c1: member.c1,
          c2: member.c2,
          footer: "caratflix · member quiz",
        };
        caption = `${memberName} is my SEVENTEEN match! 💎 Take the CaratFlix "Which member are you?" quiz.`;
      } else {
        const { score, total } = scoreSongQuiz(finishedQuiz, finalAnswers);
        const percent = Math.round((score / total) * 100);
        payload = { kind: "song", score, total };
        card = {
          slug: `caratflix-song-${score}-of-${total}`,
          emoji: "🎵",
          kicker: finishedQuiz.title,
          title: "Quiz result",
          big: `${score} / ${total}`,
          subtitle: score === total ? "Perfect score!" : score >= total / 2 ? "Nice ear!" : "Keep listening!",
          lines: [`${percent}% correct`, "Guess the song"],
          c1: accentInfo.c1 || "#f2a9c1",
          c2: accentInfo.c2 || "#9fc3e8",
          footer: "caratflix · song quiz",
        };
        caption = `I scored ${score}/${total} on the CaratFlix "Guess the song" quiz 🎵`;
      }

      saveQuizResult(profileId, finishedQuiz.id, payload);
      setResult({ quiz: finishedQuiz, payload, card, caption });
      scrollTop();
    },
    [profileId, accentInfo, scrollTop]
  );

  const pick = useCallback(
    (optionIndex) => {
      if (!quiz) return;
      const next = [...answers];
      next[step] = optionIndex;
      if (step + 1 < quiz.questions.length) {
        setAnswers(next);
        setStep(step + 1);
      } else {
        finish(quiz, next);
      }
    },
    [quiz, answers, step, finish]
  );

  return (
    <div className="quiz-page">
      <div className="quiz-head">
        <span className="quiz-eyebrow">CaratFlix quizzes</span>
        <h1 className="quiz-title">{quiz ? quiz.title : "How well do you know SEVENTEEN?"}</h1>
        <button type="button" className="quiz-back" onClick={onClose}>
          ← Back to home
        </button>
      </div>

      {result ? (
        <div className="quiz-result">
          <span className="quiz-eyebrow">Your result</span>
          <ResultCard data={result.card} caption={result.caption} />
          <div className="quiz-result-actions">
            <button type="button" className="quiz-btn quiz-btn--primary" onClick={() => startQuiz(result.quiz.id)}>
              ↻ Retake quiz
            </button>
            <button type="button" className="quiz-btn" onClick={backToMenu}>
              All quizzes
            </button>
          </div>
        </div>
      ) : quiz ? (
        <div className="quiz-runner">
          <div className="quiz-progress">
            <span className="quiz-progress-text">
              Question {step + 1} of {quiz.questions.length}
            </span>
            <span className="quiz-progress-track">
              <span
                className="quiz-progress-fill"
                style={{ width: `${((step + 1) / quiz.questions.length) * 100}%` }}
              />
            </span>
          </div>

          <h2 className="quiz-question">
            {quiz.kind === "song" ? quiz.questions[step].clue : quiz.questions[step].q}
          </h2>

          <div className="quiz-options">
            {quiz.questions[step].options.map((option, i) => {
              const label = typeof option === "string" ? option : option.label;
              return (
                <button key={label} type="button" className="quiz-option" onClick={() => pick(i)}>
                  <span className="quiz-option-key">{String.fromCharCode(65 + i)}</span>
                  <span className="quiz-option-label">{label}</span>
                </button>
              );
            })}
          </div>

          <button type="button" className="quiz-btn quiz-btn--ghost" onClick={backToMenu}>
            Quit
          </button>
        </div>
      ) : (
        <div className="quiz-menu">
          {QUIZZES.map((item) => {
            const attempt = saved[item.id];
            return (
              <button key={item.id} type="button" className="quiz-card" onClick={() => startQuiz(item.id)}>
                <span className="quiz-card-emoji" aria-hidden="true">{item.emoji}</span>
                <span className="quiz-card-title">{item.title}</span>
                <span className="quiz-card-sub">{item.subtitle}</span>
                <span className="quiz-card-best">
                  {attempt
                    ? item.kind === "member"
                      ? `Last result: ${attempt.memberName}`
                      : `Last score: ${attempt.score}/${attempt.total}`
                    : "Not played yet"}
                </span>
                <span className="quiz-card-cta">Start →</span>
              </button>
            );
          })}
          <p className="quiz-disclaimer">
            Just for fun — answers and results stay on this device. No account data leaves your browser.
          </p>
        </div>
      )}
    </div>
  );
}

export default QuizPage;
