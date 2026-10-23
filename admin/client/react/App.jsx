import React, { useEffect, useState } from 'react';
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/roles';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { useTracker } from 'meteor/react-meteor-data';
import { BrowserRouter, Routes, Route, Outlet, matchPath, useLocation, useNavigate as useRouterNavigate, useParams } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { theme } from '/imports/ui/theme';
import { NavigationContext, SearchContext } from '/imports/ui/navigation';
import { AdminShell } from '/imports/ui/shell/AdminShell';
import { SignIn } from '/imports/ui/shell/SignIn';
import { routes } from './reactRoute';

const known = (pathname) => routes.some((r) => matchPath(r.path, pathname));

/**
 * Plain links (<a href>, MUI's Link and Button with href) go through the
 * router when they lead to one of admin's pages, as FlowRouter had them;
 * other links (the server's /api files, other sites, new tabs) are left to
 * the browser.
 */
const useLinkClicks = (navigate) => useEffect(() => {
  const onClick = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const a = event.target.closest?.('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin || !known(url.pathname)) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
    event.preventDefault();
    navigate(url.pathname + url.search + url.hash);
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}, [navigate]);

const reason = (e) => (e.error === 403 ? 'Wrong username or password, or no access to the administration system.' : e.reason || e.message);

/** The signed-in account, its roles, and signing in and out. */
const Shell = () => {
  const { pathname } = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { user, roles, loggingIn, google } = useTracker(() => {
    const u = Meteor.user({ fields: { username: 1, emails: 1 } });
    return {
      user: u ? (u.username || u.emails?.[0]?.address || 'Signed in') : null,
      roles: u ? Roles.getRolesForUser(u._id) : [],
      loggingIn: Meteor.loggingIn(),
      google: !!ServiceConfiguration.configurations.findOne({ service: 'google' }),
    };
  }, []);
  const done = (err) => { setBusy(false); setError(err ? reason(err) : null); };
  const signIn = (
    <SignIn busy={busy} error={error}
      onSignIn={(selector, password) => { setBusy(true); Meteor.loginWithPassword(selector, password, done); }}
      onGoogle={google ? () => { setBusy(true); Meteor.loginWithGoogle({ requestPermissions: ['email'] }, done); } : undefined} />
  );
  return (
    <AdminShell
      user={user} roles={roles} loggingIn={loggingIn} path={pathname} signIn={signIn}
      onSignOut={() => Meteor.logout()}
      onChangePassword={(current, next) => Accounts.changePassword(current, next)}
    >
      <Outlet />
    </AdminShell>
  );
};

/** A page with its route parameters as props; a new page (another id, say) starts afresh. */
const Page = ({ component: Component }) => {
  const params = useParams();
  const { pathname } = useLocation();
  return <Component key={pathname} {...params} />;
};

const NotFound = () => <Typography variant="h4" component="h1">There is no such page</Typography>;

const Pages = () => {
  const routerNavigate = useRouterNavigate();
  const { pathname, search } = useLocation();
  const [navigate] = useState(() => (path) => routerNavigate(path));
  useLinkClicks(navigate);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  const page = ({ path, component }) => <Route key={path} path={path} element={<Page component={component} />} />;
  return (
    <NavigationContext.Provider value={navigate}>
      <SearchContext.Provider value={search}>
        <Routes>
          <Route element={<Shell />}>
            {routes.map(page)}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </SearchContext.Provider>
    </NavigationContext.Provider>
  );
};

/** Admin: the theme, the router and the route table. */
export const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <Pages />
    </BrowserRouter>
  </ThemeProvider>
);
