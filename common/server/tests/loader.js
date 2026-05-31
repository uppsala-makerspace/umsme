import { Meteor } from 'meteor/meteor';
import fs from 'fs';
import path from 'path';

const ID_RE = /^[a-z0-9-]+$/;
const TESTS = new Map();

const validateQuestion = (q) => {
  if (!q || typeof q !== 'object') return 'not an object';
  if (typeof q.id !== 'string' || !q.id) return 'missing id';
  if (!q.question || typeof q.question.sv !== 'string' || typeof q.question.en !== 'string') {
    return `question ${q.id}: missing sv/en text`;
  }
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
    if (!o.text || typeof o.text.sv !== 'string' || typeof o.text.en !== 'string') {
      return `question ${q.id}: option ${o.id} missing sv/en text`;
    }
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
  const map = new Map();
  for (const q of parsed.questions) {
    const err = validateQuestion(q);
    if (err) throw new Error(`${filePath}: ${err}`);
    if (map.has(q.id)) throw new Error(`${filePath}: duplicate question id ${q.id}`);
    map.set(q.id, q);
  }
  return map;
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
  const next = new Map();
  const testDirs = fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const td of testDirs) {
    if (!ID_RE.test(td.name)) {
      console.warn(`[tests/loader] skipping test dir with invalid name: ${td.name}`);
      continue;
    }
    const testPath = path.join(root, td.name);
    const categories = new Map();
    const files = fs.readdirSync(testPath).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const categoryId = f.slice(0, -'.json'.length);
      if (!ID_RE.test(categoryId)) {
        console.warn(`[tests/loader] skipping file with invalid category name: ${td.name}/${f}`);
        continue;
      }
      try {
        const questions = loadCategoryFile(path.join(testPath, f));
        categories.set(categoryId, questions);
      } catch (e) {
        console.error(`[tests/loader] ${td.name}/${f}: ${e.message}`);
        // keep existing data for this category if present
        const existing = TESTS.get(td.name)?.get(categoryId);
        if (existing) categories.set(categoryId, existing);
      }
    }
    if (categories.size > 0) next.set(td.name, categories);
  }
  TESTS.clear();
  for (const [k, v] of next) TESTS.set(k, v);
  console.log(`[tests/loader] loaded ${TESTS.size} tests`);
};

export const getTestIndex = () => {
  const out = [];
  for (const [testId, categories] of TESTS) {
    out.push({
      testId,
      categories: Array.from(categories, ([categoryId, qs]) => ({
        categoryId,
        questionCount: qs.size,
      })),
    });
  }
  return out;
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
