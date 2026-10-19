import { Template } from 'meteor/templating';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import './ReactPage.html';

/**
 * Hosts a React page inside the Blaze layout while admin moves module by
 * module (plan/migration.md). A route renders it as the layout's main
 * template with the component and its props as data:
 *
 *   this.render('AppBody', { main: 'ReactPage', component: Page, props: params });
 *
 * reactRoute() below does exactly that.
 */
Template.ReactPage.onRendered(function () {
  this.root = createRoot(this.find('#react-page'));
  this.autorun(() => {
    const { component, props } = Template.currentData();
    this.root.render(createElement(component, props));
  });
});

Template.ReactPage.onDestroyed(function () {
  this.root?.unmount();
});
