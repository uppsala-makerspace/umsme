import React from "react";
import PropTypes from "prop-types";
import { ChevronDownIcon } from "@heroicons/react/20/solid";

/** A choice above a list, what it shows: its own chevron, not the browser's, which sits close to the edge. */
const FilterSelect = ({ label, value, onChange, options }) => (
  <div className="relative">
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none bg-white border border-gray-300 rounded py-2 pl-3 pr-10 text-sm font-semibold text-gray-700 cursor-pointer max-w-full"
    >
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" aria-hidden="true" />
  </div>
);

FilterSelect.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })).isRequired,
};

export default FilterSelect;
