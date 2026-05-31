import TestRunner from "./TestRunner";

const sampleQuestions = [
  {
    id: "q1",
    categoryId: "general-safety",
    question: {
      sv: "Vad bör du göra innan du börjar använda en ny maskin?",
      en: "What should you do before starting to use a new machine?",
    },
    options: [
      {
        id: "a",
        text: {
          sv: "Sätta igång maskinen och testa olika inställningar.",
          en: "Turn the machine on and try different settings.",
        },
      },
      {
        id: "b",
        text: {
          sv: "Läsa instruktionerna eller be om en genomgång.",
          en: "Read the instructions or ask for a walkthrough.",
        },
      },
      {
        id: "c",
        text: {
          sv: "Fråga närmaste person oavsett deras kompetens.",
          en: "Ask the nearest person regardless of their competence.",
        },
      },
    ],
    answeredOptionId: null,
  },
  {
    id: "q2",
    categoryId: "fire-safety",
    question: {
      sv: "Var hittar du närmaste brandsläckare?",
      en: "Where do you find the nearest fire extinguisher?",
    },
    options: [
      {
        id: "a",
        text: {
          sv: "Det finns ingen.",
          en: "There isn't one.",
        },
      },
      {
        id: "b",
        text: {
          sv: "På markerade platser nära utgångarna.",
          en: "At marked locations near the exits.",
        },
      },
      {
        id: "c",
        text: {
          sv: "Bara i kontoret.",
          en: "Only in the office.",
        },
      },
    ],
    answeredOptionId: null,
  },
  {
    id: "q3",
    categoryId: "emergency",
    question: {
      sv: "Vilket nummer ringer du vid en akut nödsituation?",
      en: "What number do you call for an acute emergency?",
    },
    options: [
      { id: "a", text: { sv: "911", en: "911" } },
      { id: "b", text: { sv: "112", en: "112" } },
      { id: "c", text: { sv: "1177", en: "1177" } },
    ],
    answeredOptionId: null,
  },
];

const partiallyAnswered = sampleQuestions.map((q, idx) =>
  idx === 0 ? { ...q, answeredOptionId: "b" } : q
);

const fullyAnswered = sampleQuestions.map((q, idx) => ({
  ...q,
  answeredOptionId: idx === 0 ? "b" : idx === 1 ? "b" : "b",
}));

const noop = () => {};

export default {
  title: "Pages/TestRunner",
  component: TestRunner,
  parameters: {
    layout: "fullscreen",
  },
};

export const Loading = {
  args: {
    loading: true,
    submitting: false,
    error: null,
    questions: [],
    result: null,
    maxErrors: 1,
    onAnswer: noop,
    onSubmit: noop,
    onBack: noop,
  },
};

export const Error = {
  args: {
    loading: false,
    submitting: false,
    error: "No attempts remaining",
    questions: [],
    result: null,
    maxErrors: 1,
    onAnswer: noop,
    onSubmit: noop,
    onBack: noop,
  },
};

export const FirstQuestion = {
  args: {
    loading: false,
    submitting: false,
    error: null,
    questions: sampleQuestions,
    result: null,
    maxErrors: 1,
    onAnswer: noop,
    onSubmit: noop,
    onBack: noop,
  },
};

export const ResumedMidway = {
  args: {
    loading: false,
    submitting: false,
    error: null,
    questions: partiallyAnswered,
    result: null,
    maxErrors: 1,
    onAnswer: noop,
    onSubmit: noop,
    onBack: noop,
  },
};

export const AllAnswered = {
  args: {
    loading: false,
    submitting: false,
    error: null,
    questions: fullyAnswered,
    result: null,
    maxErrors: 1,
    onAnswer: noop,
    onSubmit: noop,
    onBack: noop,
  },
};

export const Submitting = {
  args: {
    loading: false,
    submitting: true,
    error: null,
    questions: fullyAnswered,
    result: null,
    maxErrors: 1,
    onAnswer: noop,
    onSubmit: noop,
    onBack: noop,
  },
};

export const ResultPassed = {
  args: {
    loading: false,
    submitting: false,
    error: null,
    questions: fullyAnswered,
    result: { passed: true, result: { correct: 3, total: 3, errors: 0 } },
    maxErrors: 1,
    onAnswer: noop,
    onSubmit: noop,
    onBack: noop,
  },
};

export const ResultFailed = {
  args: {
    loading: false,
    submitting: false,
    error: null,
    questions: fullyAnswered,
    result: { passed: false, result: { correct: 1, total: 3, errors: 2 } },
    maxErrors: 1,
    onAnswer: noop,
    onSubmit: noop,
    onBack: noop,
  },
};
