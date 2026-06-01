import { Meteor } from 'meteor/meteor';
import fs from 'fs';
import path from 'path';

const ID_RE = /^[a-z0-9-]+$/;
const TESTS = new Map();
const TEST_META = new Map();

const validateLocalized = (obj) => {
  if (!obj || typeof obj !== 'object') return 'not an object';
  if (typeof obj.sv !== 'string' || !obj.sv) return 'missing sv text';
  if (obj.en !== undefined && typeof obj.en !== 'string') return 'en must be a string';
  return null;
};

const validateQuestion = (q) => {
  if (!q || typeof q !== 'object') return 'not an object';
  if (typeof q.id !== 'string' || !q.id) return 'missing id';
  const qErr = validateLocalized(q.question);
  if (qErr) return `question ${q.id}: ${qErr}`;
  if (!Array.isArray(q.options) || q.options.length < 2) {
    return `question ${q.id}: needs at least 2 options`;
  }
  let correctCount = 0;
  const optionIds = new Set();
  for (const o of q.options) {
    if (!o || typeof o.id !== 'string' || !o.id) {
      return `question ${q.id}: option missing id`;
    }
    if (optionIds.has(o.id)) {
      return `question ${q.id}: duplicate option id ${o.id}`;
    }
    optionIds.add(o.id);
    const oErr = validateLocalized(o.text);
    if (oErr) return `question ${q.id}: option ${o.id} ${oErr}`;
    if (o.correct === true) correctCount += 1;
  }
  if (correctCount !== 1) {
    return `question ${q.id}: expected exactly one correct option, got ${correctCount}`;
  }
  return null;
};

const loadCategoryFile = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.questions)) {
    throw new Error(`${filePath}: missing "questions" array`);
  }
  let title = null;
  if (parsed.title !== undefined) {
    const tErr = validateLocalized(parsed.title);
    if (tErr) throw new Error(`${filePath}: title: ${tErr}`);
    title = parsed.title;
  }
  const questions = new Map();
  for (const q of parsed.questions) {
    const err = validateQuestion(q);
    if (err) throw new Error(`${filePath}: ${err}`);
    if (questions.has(q.id)) throw new Error(`${filePath}: duplicate question id ${q.id}`);
    questions.set(q.id, q);
  }
  return { title, questions };
};

const getRoot = () => Meteor.settings?.tests?.path || null;

export const loadAllTests = () => {
  const root = getRoot();
  if (!root) {
    console.warn('[tests/loader] Meteor.settings.tests.path not set; skipping load');
    return;
  }
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.warn(`[tests/loader] tests root does not exist: ${root}`);
    return;
  }
  const nextTests = new Map();
  const nextMeta = new Map();
  const testDirs = fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const td of testDirs) {
    if (!ID_RE.test(td.name)) {
      console.warn(`[tests/loader] skipping test dir with invalid name: ${td.name}`);
      continue;
    }
    const testPath = path.join(root, td.name);
    const categories = new Map();
    const metaForTest = new Map();
    const files = fs.readdirSync(testPath).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const categoryId = f.slice(0, -'.json'.length);
      if (!ID_RE.test(categoryId)) {
        console.warn(`[tests/loader] skipping file with invalid category name: ${td.name}/${f}`);
        continue;
      }
      try {
        const { title, questions } = loadCategoryFile(path.join(testPath, f));
        categories.set(categoryId, questions);
        metaForTest.set(categoryId, { title });
      } catch (e) {
        console.error(`[tests/loader] ${td.name}/${f}: ${e.message}`);
        // keep existing data for this category if present
        const existing = TESTS.get(td.name)?.get(categoryId);
        if (existing) {
          categories.set(categoryId, existing);
          const existingMeta = TEST_META.get(td.name)?.get(categoryId);
          if (existingMeta) metaForTest.set(categoryId, existingMeta);
        }
      }
    }
    if (categories.size > 0) {
      nextTests.set(td.name, categories);
      nextMeta.set(td.name, metaForTest);
    }
  }
  TESTS.clear();
  TEST_META.clear();
  for (const [k, v] of nextTests) TESTS.set(k, v);
  for (const [k, v] of nextMeta) TEST_META.set(k, v);
  console.log(`[tests/loader] loaded ${TESTS.size} tests`);
};

export const getTestIndex = () => {
  const out = [];
  for (const [testId, categories] of TESTS) {
    const meta = TEST_META.get(testId);
    out.push({
      testId,
      categories: Array.from(categories, ([categoryId, qs]) => ({
        categoryId,
        questionCount: qs.size,
        title: meta?.get(categoryId)?.title || null,
      })),
    });
  }
  return out;
};

export const getCategoryTitle = (testId, categoryId) => {
  return TEST_META.get(testId)?.get(categoryId)?.title || null;
};

export const hasTest = (testId) => TESTS.has(testId);

export const getCategoryIds = (testId) => {
  const t = TESTS.get(testId);
  return t ? Array.from(t.keys()) : [];
};

export const getQuestion = (testId, categoryId, questionId) => {
  return TESTS.get(testId)?.get(categoryId)?.get(questionId) || null;
};

export const sanitizeQuestion = (q) => {
  if (!q) return null;
  return {
    id: q.id,
    question: q.question,
    options: q.options.map(o => ({ id: o.id, text: o.text })),
  };
};

export const pickQuestion = (testId, categoryId, excludeIds = []) => {
  const cat = TESTS.get(testId)?.get(categoryId);
  if (!cat || cat.size === 0) return null;
  const excludeSet = new Set(excludeIds);
  let pool = Array.from(cat.values()).filter(q => !excludeSet.has(q.id));
  if (pool.length === 0) {
    // exhausted — start over from full pool
    pool = Array.from(cat.values());
  }
  return pool[Math.floor(Math.random() * pool.length)];
};

export const isCorrectAnswer = (testId, categoryId, questionId, optionId) => {
  const q = getQuestion(testId, categoryId, questionId);
  if (!q) return false;
  const opt = q.options.find(o => o.id === optionId);
  return !!opt && opt.correct === true;
};
