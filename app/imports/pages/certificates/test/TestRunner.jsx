import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Button from "../../../components/Button";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import { getLocalized } from "../utils";

const initialIndex = (questions) => {
  const idx = questions.findIndex((q) => !q.answeredOptionId);
  return idx === -1 ? Math.max(0, questions.length - 1) : idx;
};

const TestRunner = ({
  loading,
  submitting,
  error,
  questions,
  result,
  maxErrors,
  onAnswer,
  onSubmit,
  onBack,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";

  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (!questions || questions.length === 0) return;
    const ans = {};
    for (const q of questions) {
      if (q.answeredOptionId) ans[q.id] = q.answeredOptionId;
    }
    setAnswers(ans);
    setCurrentIdx(initialIndex(questions));
  }, [questions]);

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  if (error) {
    return (
      <MainContent>
        <p className="text-red-600 text-center p-8">{error}</p>
        <Button onClick={onBack}>{t("testBackToCertificate")}</Button>
      </MainContent>
    );
  }

  if (result) {
    return (
      <MainContent>
        <div
          className={`p-6 rounded-lg border-l-4 mb-6 ${
            result.passed
              ? "border-l-green-500 bg-green-50"
              : "border-l-red-500 bg-red-50"
          }`}
        >
          <h2 className="text-2xl mb-3">
            {result.passed ? t("testPassed") : t("testFailed")}
          </h2>
          <p className="text-gray-700">
            {t("testResultSummary", {
              correct: result.result.correct,
              total: result.result.total,
              maxErrors,
            })}
          </p>
        </div>
        <Button onClick={onBack}>{t("testBackToCertificate")}</Button>
      </MainContent>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <MainContent>
        <p>{t("testNoAttemptsLeft")}</p>
        <Button onClick={onBack}>{t("testBackToCertificate")}</Button>
      </MainContent>
    );
  }

  const q = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const selected = answers[q.id];

  const selectOption = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const persistCurrent = () => {
    const currentId = q.id;
    const currentSelected = answers[currentId];
    if (currentSelected) onAnswer(currentId, currentSelected);
  };

  const handleNext = () => {
    persistCurrent();
    setCurrentIdx((i) => i + 1);
  };

  const handleSubmit = () => {
    const unanswered = questions.some((qq) => !answers[qq.id]);
    if (unanswered && !window.confirm(t("testUnansweredWarning"))) return;
    persistCurrent();
    onSubmit();
  };

  return (
    <MainContent>
      <p className="text-sm text-gray-500 mb-2">
        {t("testQuestionOf", { current: currentIdx + 1, total: questions.length })}
      </p>
      <h2 className="text-xl mb-6 text-gray-800">{getLocalized(q.question, lang)}</h2>
      <div className="space-y-3 mb-6">
        {q.options.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => selectOption(q.id, opt.id)}
              className={`block w-full text-left p-4 rounded-lg border-2 transition-colors ${
                isSelected
                  ? "border-brand-green bg-brand-green text-surface font-medium"
                  : "border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              {getLocalized(opt.text, lang)}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between gap-2">
        <Button
          variant="secondary"
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
        >
          {t("testPrevious")}
        </Button>
        {isLast ? (
          <Button onClick={handleSubmit} disabled={submitting}>
            {t("testSubmit")}
          </Button>
        ) : (
          <Button onClick={handleNext}>{t("testNext")}</Button>
        )}
      </div>
    </MainContent>
  );
};

TestRunner.propTypes = {
  loading: PropTypes.bool,
  submitting: PropTypes.bool,
  error: PropTypes.string,
  questions: PropTypes.array,
  result: PropTypes.object,
  maxErrors: PropTypes.number,
  onAnswer: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default TestRunner;
