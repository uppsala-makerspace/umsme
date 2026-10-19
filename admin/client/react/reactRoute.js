import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './ReactPage';

/** A route that shows a React page; the route parameters become its props. */
export const reactRoute = (path, name, component) => FlowRouter.route(path, {
  name,
  action(params) {
    this.render('AppBody', { main: 'ReactPage', component, props: { ...params } });
  },
});
