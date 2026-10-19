import React, { useEffect, useState } from 'react';
import { MemberStatus } from './MemberStatus';
import { memberStatus, checkPath } from './data';

/** /check/:_id, the status page a member's link leads to. */
export const MemberStatusPage = ({ _id }) => {
  const [status, setStatus] = useState(null);
  useEffect(() => { memberStatus(_id).then(setStatus, () => setStatus({ member: false, info: {} })); }, [_id]);
  return <MemberStatus status={status} searchPath={checkPath().replace(/#$/, '')} />;
};
