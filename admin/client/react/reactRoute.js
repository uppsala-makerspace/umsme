import { createElement } from 'react';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '/imports/ui/theme';
import './ReactPage';

/** Every React page gets the MUI theme. */
const themed = (component) => (props) =>
  createElement(ThemeProvider, { theme }, createElement(component, props));

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
