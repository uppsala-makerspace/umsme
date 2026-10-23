import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { createSvgIcon } from '@mui/material/utils';
import { ChangePassword } from './ChangePassword';
import { menuFor, ACCESS_ROLES } from './menu';

const MenuIcon = createSvgIcon(<path d="M3 18h18v-2H3zm0-5h18v-2H3zm0-7v2h18V6z" />, 'Menu');

const DRAWER = 200;
const BAR = 44;
const RED = '#660000';
const COLLAPSED_KEY = 'adminMenuCollapsed';

// The sections folded away, remembered in this browser.
const readCollapsed = () => {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSED_KEY)) || {};
  } catch (e) {
    return {};
  }
};
const writeCollapsed = (collapsed) => {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed));
  } catch (e) {
    // Not remembered, then.
  }
};

const Sidebar = ({ sections, path, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggle = (key) => setCollapsed((c) => { const next = { ...c, [key]: !c[key] }; writeCollapsed(next); return next; });
  const item = (href, label) => (
    <ListItemButton key={href} component="a" href={href} selected={path === href} onClick={onNavigate}
      sx={{ py: 0.5, pl: 4, '&.Mui-selected, &.Mui-selected:hover, &:hover': { backgroundColor: '#990000' } }}>
      <ListItemText primary={label} slotProps={{ primary: { variant: 'body2' } }} />
    </ListItemButton>
  );
  return (
    <Box component="nav" aria-label="Admin" sx={{ color: '#fff' }}>
      <List dense disablePadding>
        <ListItemButton component="a" href="/" selected={path === '/'} onClick={onNavigate} sx={{ py: 0.5, '&:hover, &.Mui-selected': { backgroundColor: '#990000' } }}>
          <ListItemText primary="Home" slotProps={{ primary: { variant: 'body2' } }} />
        </ListItemButton>
        {sections.map((section) => (section.title ? (
          <li key={section.key}>
            <ListSubheader component="button" onClick={() => toggle(section.key)} aria-expanded={!collapsed[section.key]}
              sx={{ width: '100%', textAlign: 'left', border: 0, cursor: 'pointer', backgroundColor: RED, color: '#ccc', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', lineHeight: '32px', display: 'flex', justifyContent: 'space-between', '&:hover': { backgroundColor: '#990000' } }}>
              <span>{section.title}</span><span aria-hidden>{collapsed[section.key] ? '▸' : '▾'}</span>
            </ListSubheader>
            {!collapsed[section.key] && <List dense disablePadding>{section.items.map(([href, label]) => item(href, label))}</List>}
          </li>
        ) : section.items.map(([href, label]) => item(href, label))))}
      </List>
    </Box>
  );
};

const Account = ({ user, onSignOut, onChangePassword }) => {
  const [anchor, setAnchor] = useState(null);
  const [changing, setChanging] = useState(false);
  return (
    <>
      <Button variant="contained" size="small" onClick={(e) => setAnchor(e.currentTarget)} aria-haspopup="menu"
        sx={{ backgroundColor: '#fff', color: RED, fontWeight: 700, textTransform: 'none', '&:hover': { backgroundColor: '#f6e3e3' } }}>
        {user} ▾
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {onChangePassword && <MenuItem onClick={() => { setAnchor(null); setChanging(true); }}>Change password</MenuItem>}
        <MenuItem onClick={() => { setAnchor(null); onSignOut(); }}>Sign out</MenuItem>
      </Menu>
      {onChangePassword && <ChangePassword open={changing} onClose={() => setChanging(false)} onChange={onChangePassword} />}
    </>
  );
};

/**
 * Admin's frame around every page: the top bar with the account, the menu
 * on the left (behind a button on narrow screens), and the page, if the
 * person may see it. Signed out, the page asks you to sign in.
 *
 * @param {{ user: string|null, roles: string[], loggingIn?: boolean, path: string, signIn: React.ReactNode,
 *           onSignOut: () => void, onChangePassword?: (current, next) => Promise<void>, children: React.ReactNode }} props
 *   `user` is the name shown for the account signed in, null for nobody.
 */
export const AdminShell = ({ user, roles, loggingIn = false, path, signIn, onSignOut, onChangePassword, children }) => {
  const narrow = useMediaQuery((t) => t.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const sections = user ? menuFor(roles) : [];
  const allowed = roles.some((r) => ACCESS_ROLES.includes(r));
  let main;
  if (loggingIn) main = <Typography color="text.secondary">Signing in…</Typography>;
  else if (!user) main = <><Typography variant="h4" component="h1" sx={{ mb: 2 }}>You have to sign in first!</Typography>{signIn}</>;
  else if (!allowed) main = <Typography variant="h4" component="h1">You do not have access to this administration system</Typography>;
  else main = children;
  const drawer = <Sidebar sections={sections} path={path} onNavigate={() => setOpen(false)} />;
  const paper = { width: DRAWER, backgroundColor: RED, color: '#fff', top: { xs: 0, md: BAR }, height: { md: `calc(100% - ${BAR}px)` }, border: 0 };
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#fff' }}>
      <AppBar position="fixed" elevation={3} sx={{ backgroundColor: RED, zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar variant="dense" sx={{ minHeight: BAR, justifyContent: 'space-between' }}>
          {narrow ? <IconButton color="inherit" edge="start" aria-label="Menu" onClick={() => setOpen(true)}><MenuIcon /></IconButton> : <span />}
          {user ? <Account user={user} onSignOut={onSignOut} onChangePassword={onChangePassword} /> : <span />}
        </Toolbar>
      </AppBar>
      {narrow
        ? <Drawer open={open} onClose={() => setOpen(false)} slotProps={{ paper: { sx: paper } }}>{drawer}</Drawer>
        : <Drawer variant="permanent" slotProps={{ paper: { sx: paper } }}>{drawer}</Drawer>}
      <Box component="main" sx={{ pt: `${BAR + 12}px`, pb: 4, px: { xs: 2, md: 2.5 }, ml: { md: `${DRAWER}px` } }}>
        {main}
      </Box>
    </Box>
  );
};
