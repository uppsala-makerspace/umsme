import React from 'react';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

const TABS = [['manual', 'Manual'], ['automatic', 'Automatic'], ['memberships', 'Memberships'], ['store', 'Purchases']];
const native = { select: { native: true }, inputLabel: { shrink: true } };

/**
 * The payments, a tab per kind: manual (with the bank synchronization),
 * automatic, for memberships, and webshop purchases (by item).
 *
 * @param {{ tab: string, onTab: (tab) => void, bank?: React.ReactNode, list: React.ReactNode,
 *           storeItems?: object[], storeItem?: string, onStoreItem?: (id) => void }} props
 */
export const Payments = ({ tab, onTab, bank, list, storeItems = [], storeItem = '', onStoreItem }) => (
  <Box>
    <Typography variant="h4" component="h1" sx={{ mb: 1 }}>Payments</Typography>
    <Tabs value={tab} onChange={(e, next) => onTab(next)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
      {TABS.map(([value, label]) => <Tab key={value} value={value} label={label} />)}
    </Tabs>
    {tab === 'manual' && bank}
    <Typography variant="h5" component="h2" sx={{ mb: 1 }}>{{ manual: 'Manual payments', automatic: 'Automatic payments', memberships: 'Membership payments', store: 'Webshop purchases' }[tab]}</Typography>
    {tab === 'memberships' && (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Payments linked to a membership: the ones we know for certain were for membership, manual and automatic alike.
        Payments marked other and ones not yet treated are handled under Manual.
      </Typography>
    )}
    {tab === 'store' && (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Payments linked to a store item. The bookkeeping account comes from the item itself.</Typography>
        <TextField label="Store item" select slotProps={native} value={storeItem} onChange={(e) => onStoreItem(e.target.value)} sx={{ mb: 2, minWidth: 280 }}>
          <option value="">All items</option>
          {storeItems.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
        </TextField>
      </>
    )}
    {list}
  </Box>
);
