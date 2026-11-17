import { Categories } from '/imports/common/collections/categories';
import { slugify } from '/imports/common/lib/slug';

/** A category, its slug from the Swedish name unless given. @returns {Promise<string>} its id */
export const makeCategory = (sv, en, sortOrder, slug = slugify(sv)) =>
  Categories.insertAsync({ name: { sv, ...(en ? { en } : {}) }, slug, sortOrder, updatedAt: new Date() });
