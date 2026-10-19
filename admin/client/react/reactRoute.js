import { createElement } from 'react';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '/imports/ui/theme';
import { NavigationContext } from '/imports/ui/navigation';
import './ReactPage';

const go = (path) => FlowRouter.go(path);

/** A component with the MUI theme and FlowRouter navigation around it, as every React page gets. */
export const themed = (component) => (props) =>
  createElement(NavigationContext.Provider, { value: go },
    createElement(ThemeProvider, { theme }, createElement(component, props)));

/** A route that shows a React page; the route parameters become its props. */
export const reactRoute = (path, name, component) => {
  const page = themed(component);
  return FlowRouter.route(path, {
    name,
    action(params) {
      this.render('AppBody', { main: 'ReactPage', component: page, props: { ...params } });
    },
  });
};
