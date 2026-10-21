import React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { storageMemberLabel } from '/imports/storage/presentation';

/**
 * Pick a member by name, member number or email, among the members the
 * storage page has.
 *
 * @param {{ label: string, members: object[], value: string|null, onChange: (memberId|null) => void,
 *           required?: boolean, placeholder?: string }} props
 */
export const StorageMemberPicker = ({ label, members, value, onChange, required = false, placeholder = 'Search by name, member number, or email' }) => (
  <Autocomplete
    options={members}
    value={members.find((m) => m._id === value) || null}
    onChange={(event, member) => onChange(member?._id || null)}
    getOptionLabel={storageMemberLabel}
    isOptionEqualToValue={(a, b) => a._id === b._id}
    renderInput={(params) => <TextField {...params} label={label} required={required} placeholder={placeholder} />}
    sx={{ minWidth: 280 }}
  />
);
