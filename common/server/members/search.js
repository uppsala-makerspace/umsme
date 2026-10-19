import { Members } from '/imports/common/collections/members';

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Members whose name, email or member number contains every word of
 * `query`, for pickers that look someone up: a few fields each, at most
 * `limit`, excluded members left out.
 */
export const searchMembers = async (query, { limit = 20 } = {}) => {
  const words = (query || '').trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (!words.length) return [];
  const selector = {
    excluded: { $ne: true },
    $and: words.map((word) => {
      const pattern = new RegExp(escape(word), 'i');
      return { $or: [{ name: pattern }, { email: pattern }, { mid: pattern }] };
    }),
  };
  return Members.find(selector, { fields: { name: 1, email: 1, mid: 1 }, sort: { name: 1 }, limit }).fetchAsync();
};

/** Names and member numbers for the given members, to show who a stored id is. */
export const memberNames = (ids) =>
  Members.find({ _id: { $in: ids.slice(0, 500) } }, { fields: { name: 1, mid: 1 } }).fetchAsync();
