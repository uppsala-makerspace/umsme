import React, { useEffect, useRef } from 'react';
import { Blaze } from 'meteor/blaze';
import { Template } from 'meteor/templating';

/**
 * A Blaze template inside a React page, for a piece that belongs to a module
 * not migrated yet (comments, for instance). Containers only: it needs Blaze,
 * so pure components and their stories never use it. Goes when Blaze does.
 */
export const BlazeTemplate = ({ name, data }) => {
  const ref = useRef(null);
  const key = JSON.stringify(data);
  useEffect(() => {
    const view = Blaze.renderWithData(Template[name], data, ref.current);
    return () => Blaze.remove(view);
  }, [name, key]);
  return <div ref={ref} />;
};
