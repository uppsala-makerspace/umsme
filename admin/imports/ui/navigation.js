import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

/**
 * Navigation for React pages. The only place they meet the router: FlowRouter
 * now, React Router once the Blaze layout is gone. Plain <a href> links work
 * as they are.
 */
export const navigate = (path) => FlowRouter.go(path);

export const useNavigate = () => navigate;
