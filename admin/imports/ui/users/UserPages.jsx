import React, { useEffect, useMemo, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from '../navigation';
import { useEditor } from '../components/useEditor';
import { useServerList } from '../components/useServerList';
import { CommentsFor } from '../comments/CommentsFor';
import { UserList } from './UserList';
import { UserAdd } from './UserAdd';
import { UserView } from './UserView';
import { userPage, userDetail, updateUser, setUserRole, removeUser, setPassword, createUser } from './data';

const userValues = (detail) => ({ username: detail?.user.username || '', email: detail?.user.emails?.[0]?.address || '' });

/** /users */
export const UsersPage = () => <UserList {...useServerList(userPage)} />;

/** /users/add */
export const UserAddPage = () => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const add = async (username, password) => {
    setBusy(true);
    setError(null);
    try {
      navigate(`/user/${await createUser(username, password)}`);
    } catch (e) {
      setError(e.reason || e.message);
      setBusy(false);
    }
  };
  return <UserAdd onAdd={add} busy={busy} error={error} />;
};

/** /user/:_id */
export const UserViewPage = ({ _id }) => {
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [missing, setMissing] = useState(false);
  // An account has no version to check a save against; the detail's own identity stands in.
  const doc = useMemo(() => detail && { _id, ...detail }, [detail]);
  const { values, setField, run, busy, error, setError, notice, setNotice } = useEditor({ doc, loading: !detail, toValues: userValues, version: (d) => d });
  const load = () => userDetail(_id).then(setDetail, (e) => (e.error === 'not-found' ? setMissing(true) : setError(e.reason || e.message)));
  useEffect(() => { load(); }, [_id]);
  if (missing) return <Typography>There is no such user.</Typography>;
  if (!detail) return <Typography color="text.secondary">{error || 'Loading…'}</Typography>;
  return (
    <UserView
      detail={detail} values={values} onChange={setField} busy={busy} error={error} notice={notice}
      onSave={() => run(async () => { await updateUser(_id, values); await load(); }, { keep: 'all', then: () => setNotice('Saved.') })}
      on={{
        setRole: (role, on) => run(async () => { await setUserRole(_id, role, on); await load(); }),
        setPassword: async (password) => {
          let done = false;
          await run(() => setPassword(_id, password), { then: () => { done = true; } });
          return done;
        },
        remove: () => run(() => removeUser(_id), { then: () => navigate('/users') }),
      }}
      after={<CommentsFor about={_id} />}
    />
  );
};
