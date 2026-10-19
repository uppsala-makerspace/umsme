import React, { useEffect, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

const label = (member) => (member ? `${member.name}${member.mid ? ` (${member.mid})` : ''}` : '');

/**
 * Pick one member by searching: name, email or member number. The matches
 * come from `search`, so the page never needs every member.
 *
 * @param {{ label: string, value: { _id, name, mid }|null, onChange: (member|null) => void,
 *           search: (query: string) => Promise<Array<{ _id, name, mid, email }>>,
 *           helperText?: string, disabled?: boolean }} props
 */
export const MemberSelect = ({ label: fieldLabel, value, onChange, search, helperText, disabled = false }) => {
  const [input, setInput] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (input.trim().length < 2 || input === label(value)) {
      setOptions(value ? [value] : []);
      return undefined;
    }
    let current = true;
    setLoading(true);
    const timer = setTimeout(() => {
      search(input).then((found) => { if (current) setOptions(found); }, () => {}).finally(() => { if (current) setLoading(false); });
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [input]);

  return (
    <Autocomplete
      value={value}
      options={options}
      loading={loading}
      disabled={disabled}
      filterOptions={(x) => x}
      getOptionLabel={label}
      isOptionEqualToValue={(a, b) => a._id === b._id}
      onChange={(event, member) => onChange(member)}
      onInputChange={(event, text) => setInput(text)}
      noOptionsText={input.trim().length < 2 ? 'Type at least two letters' : 'No members found'}
      renderOption={({ key, ...props }, member) => (
        <li key={member._id} {...props}>{label(member)}{member.email ? <span style={{ opacity: 0.6, marginLeft: 8 }}>{member.email}</span> : null}</li>
      )}
      renderInput={(params) => <TextField {...params} label={fieldLabel} helperText={helperText} placeholder="Name, email or member number" />}
    />
  );
};
