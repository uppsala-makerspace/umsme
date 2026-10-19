import React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import { createSvgIcon } from '@mui/material/utils';

// MUI's own chip delete icon, but able to carry a name ("Remove Keramik").
export const RemoveIcon = createSvgIcon(
  <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />,
  'Remove',
);

/**
 * Pick several values: a search field with a dropdown, the picked values
 * shown as pills, each with a cross to remove it. For a choice among more
 * options than a row of checkboxes handles well.
 *
 * @param {{ label: string, options: Array<{ value: string, label: string, group?: string }>,
 *           value: string[], onChange: (values: string[]) => void, placeholder?: string,
 *           disabled?: boolean, helperText?: string }} props
 *   With `group` on the options, the dropdown groups them under it.
 */
export const ChipSelect = ({ label, options, value, onChange, placeholder = 'Search…', disabled = false, helperText }) => {
  const selected = value.map((v) => options.find((o) => o.value === v)).filter(Boolean);
  const grouped = options.some((o) => o.group);
  return (
    <Autocomplete
      multiple
      filterSelectedOptions
      disabled={disabled}
      options={grouped ? [...options].sort((a, b) => (a.group || '').localeCompare(b.group || '')) : options}
      groupBy={grouped ? (o) => o.group || '' : undefined}
      value={selected}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      onChange={(event, next) => onChange(next.map((o) => o.value))}
      noOptionsText="No matches"
      renderValue={(items, getItemProps) => items.map((option, index) => {
        const { key, ...itemProps } = getItemProps({ index });
        return (
          <Chip key={key} size="small" label={option.label} {...itemProps}
            deleteIcon={<RemoveIcon titleAccess={`Remove ${option.label}`} />} />
        );
      })}
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder={selected.length ? '' : placeholder} helperText={helperText} />
      )}
    />
  );
};
