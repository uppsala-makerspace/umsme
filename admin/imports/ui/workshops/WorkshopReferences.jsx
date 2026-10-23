import React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import { Section } from '../components/Section';

const GROUP_TYPES = { steering: 'Steering group', function: 'Function group', responsibility: 'Responsibility group' };

/** Everything that refers to the workshop, as many as the References tab counts. */
export const referenceCount = (details) => (details
  ? details.certificates.length + details.storeItems.length + details.relatedGroups.length
    + (details.viaGroup ? details.viaGroup.responsibilityGroups.length + details.viaGroup.relatedGroups.length + details.viaGroup.expenseAccounts.length : 0)
  : undefined);

/** What refers to the workshop directly: these keep it from being deleted. */
export const directReferenceCount = (details) => (details ? details.certificates.length + details.storeItems.length + details.relatedGroups.length : 0);

const Kind = ({ title, items, render }) => (items.length === 0 ? null : (
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>{title} ({items.length})</Typography>
    <List dense disablePadding>
      {items.map((item) => <ListItem key={item._id} disableGutters sx={{ gap: 1 }}>{render(item)}</ListItem>)}
    </List>
  </Box>
));

const groupLink = (g) => <><Link href={`/group/${g._id}`}>{g.name?.sv || g._id}</Link>{GROUP_TYPES[g.type] && <Typography variant="body2" color="text.secondary">{GROUP_TYPES[g.type]}</Typography>}</>;

/**
 * The References tab: what refers to a workshop, a heading per kind; first
 * what refers to it directly (certificates, store items sold for it, groups
 * related to it), then what refers to its steering group. Kinds with
 * nothing are left out.
 *
 * @param {{ details: object|null, noun: string }} props
 *   `details` as workshops.details returns it, null while it loads.
 */
export const WorkshopReferences = ({ details, noun }) => {
  if (!details) return <Typography variant="body2">Looking…</Typography>;
  const via = details.viaGroup;
  const direct = directReferenceCount(details);
  const throughGroup = via ? via.responsibilityGroups.length + via.relatedGroups.length + via.expenseAccounts.length : 0;
  return (
    <>
      <Section sx={{ mt: 0 }} title={`Refers to this ${noun}`} note={direct ? `While anything here refers to it, the ${noun} can not be deleted.` : undefined}>
        {direct === 0 && <Typography variant="body2" color="text.secondary">Nothing refers to this {noun} directly.</Typography>}
        <Kind title="Certificates" items={details.certificates} render={(c) => <Link href={`/certificate/${c._id}`}>{c.name?.sv || c._id}</Link>} />
        <Kind title="Store items" items={details.storeItems} render={(i) => <><Link href={`/storeitem/${i._id}`}>{i.name?.sv || i.code}</Link><Typography variant="body2" color="text.secondary">{i.code}</Typography></>} />
        <Kind title="Related groups" items={details.relatedGroups} render={groupLink} />
      </Section>
      {via && (
        <Section title={<>Through the steering group <Link href={`/group/${via.group._id}`}>{via.group.name?.sv}</Link></>}>
          {throughGroup === 0 && <Typography variant="body2" color="text.secondary">Nothing refers to the steering group.</Typography>}
          <Kind title="Responsibility groups" items={via.responsibilityGroups} render={groupLink} />
          <Kind title="Groups related to it" items={via.relatedGroups} render={groupLink} />
          <Kind title="Expense accounts" items={via.expenseAccounts} render={(a) => (
            <>
              <Link href={`/expenseaccount/${a._id}`}>{a.name}</Link>
              {a.member && <Chip size="small" label="Its group" />}
              {a.approver && <Chip size="small" label="Approves" />}
            </>
          )} />
        </Section>
      )}
    </>
  );
};
