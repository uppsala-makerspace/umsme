const f = (userId) => {
  return userId !== null;
};
export const allow = (collection) => {
  collection.allow({
    insert: f,
    update: f,
    remove: f
  });
};