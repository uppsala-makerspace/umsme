import React from "react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import DateField from "../../../components/DateField";
import TimeField from "../../../components/TimeField";

/**
 * The form fields of the activity and event forms, labelled, in the app's
 * style. Each passes its other props to the element.
 */
const control =
  "bg-surface border border-black rounded py-2.5 px-3 text-base font-mono w-full box-border focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300";

export const Field = ({ id, label, hint, children }) => (
  <div className="mb-4 w-full">
    <label htmlFor={id} className="block mb-1 font-bold">{label}</label>
    {children}
    {hint && <p className="text-gray-500 mt-1 text-xs">{hint}</p>}
  </div>
);

export const TextField = ({ id, label, hint, value, onChange, multiline = false, ...props }) => (
  <Field id={id} label={label} hint={hint}>
    {multiline
      ? <textarea id={id} rows={5} className={control} value={value} onChange={(e) => onChange(e.target.value)} {...props} />
      : <input id={id} className={control} value={value} onChange={(e) => onChange(e.target.value)} {...props} />}
  </Field>
);

/** A day, always YYYY-MM-DD (see DateField). */
export const DayField = ({ id, label, hint, value, onChange, ...props }) => (
  <Field id={id} label={label} hint={hint}>
    <DateField id={id} className={control} value={value} onChange={onChange} {...props} />
  </Field>
);

/** A time of day, always HH:MM (see TimeField). */
export const ClockField = ({ id, label, hint, value, onChange, ...props }) => (
  <Field id={id} label={label} hint={hint}>
    <TimeField id={id} className={control} value={value} onChange={onChange} {...props} />
  </Field>
);

/** A choice among `options` ({ value, label }), the first being `empty` (value ''). */
export const SelectField = ({ id, label, hint, value, onChange, options, empty }) => (
  <Field id={id} label={label} hint={hint}>
    {/* Its own chevron, not the browser's, which sits close to the edge. */}
    <div className="relative">
      <select id={id} className={`${control} appearance-none pr-10`} value={value} onChange={(e) => onChange(e.target.value)}>
        {empty !== undefined && <option value="">{empty}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" aria-hidden="true" />
    </div>
  </Field>
);

export const CheckField = ({ id, label, checked, onChange }) => (
  <label htmlFor={id} className="flex items-center gap-2 mb-4 cursor-pointer">
    <input id={id} type="checkbox" className="w-5 h-5 accent-brand-green" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>{label}</span>
  </label>
);

export const Row = ({ children }) => <div className="flex flex-col sm:flex-row sm:gap-4">{children}</div>;
