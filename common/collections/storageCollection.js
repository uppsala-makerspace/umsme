import 'meteor/aldeed:collection2/static';

/** Storage state is mutated only by checked server methods. */
export const attachServerOnlySchema = (collection, schema) => {
  collection.attachSchema(schema);
  collection.deny({
    insert() { return true; },
    update() { return true; },
    remove() { return true; },
  });
  return collection;
};
