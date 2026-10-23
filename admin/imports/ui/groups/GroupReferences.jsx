import React from 'react';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { isAreaOfInterest } from '/imports/common/lib/groupRules';
import { TabToolbar } from '../components/PageTabs';
import { ReferenceKind } from '../components/ReferenceKind';
import { workshopPath } from '../workshops/paths';

const GROUP_TYPES = { steering: 'Steering group', function: 'Function group', responsibility: 'Responsibility group' };

/** Everything the References tab lists, as many as it counts (members have a tab of their own). */
export const referenceCount = (references) => (references
  ? (references.workshop ? 1 : 0) + references.childGroups.length + references.relatedGroups.length + references.expenseAccounts.length
  : undefined);

const groupLink = (g) => <><Link href={`/group/${g._id}`}>{g.name?.sv || g._id}</Link>{GROUP_TYPES[g.type] && <Typography variant="body2" color="text.secondary">{GROUP_TYPES[g.type]}</Typography>}</>;

/**
 * The References tab of a group: what refers to it, a heading per kind
 * (the workshop it steers, the responsibility groups under it, the groups
 * that name it as related, its expense accounts). Kinds with nothing are
 * left out. While anything here, or a member, refers to it, the group can
 * not be deleted.
 *
 * @param {{ references: object|null }} props as groups.references returns it, null while it loads
 */
export const GroupReferences = ({ references }) => {
  if (!references) return <Typography variant="body2">Looking…</Typography>;
  const { workshop } = references;
  return (
    <>
      <TabToolbar note={referenceCount(references) ? 'While anything here, or a member, refers to it, the group can not be deleted.' : 'Nothing refers to this group.'} />
      <ReferenceKind title={workshop && isAreaOfInterest(workshop) ? 'Steers the area of interest' : 'Steers the workshop'} items={workshop ? [workshop] : []}
        render={(w) => <Link href={workshopPath(w._id, 'references')}>{w.name?.sv}</Link>} />
      <ReferenceKind title="Responsibility groups" items={references.childGroups} render={groupLink} />
      <ReferenceKind title="Groups related to it" items={references.relatedGroups} render={groupLink} />
      <ReferenceKind title="Expense accounts" items={references.expenseAccounts} render={(a) => (
        <>
          <Link href={`/expenseaccount/${a._id}`}>{a.name}</Link>
          {a.member && <Chip size="small" label="Its group" />}
          {a.approver && <Chip size="small" label="Approves" />}
        </>
      )} />
    </>
  );
};
