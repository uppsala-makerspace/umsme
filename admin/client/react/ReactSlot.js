import { Template } from 'meteor/templating';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { themed } from './reactRoute';
import './ReactSlot.html';

/**
 * A React component inside a Blaze page that is not migrated yet, such as
 * the certificates on the member page:
 *
 *   {{> ReactSlot component=certificates props=certificateProps}}
 *
 * The component gets the MUI theme and navigation, as a routed page does.
 */
Template.ReactSlot.onRendered(function () {
  this.root = createRoot(this.firstNode);
  this.autorun(() => {
    const { component, props } = Template.currentData();
    if (this.component !== component) {
      this.component = component;
      this.page = themed(component);
    }
    this.root.render(createElement(this.page, props));
  });
});

Template.ReactSlot.onDestroyed(function () {
  this.root?.unmount();
});
