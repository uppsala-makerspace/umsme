import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { parseDay } from "/imports/common/lib/days";

/**
 * A day, written YYYY-MM-DD whatever the app's language (the browser's own
 * date field follows the browser's, and shows MM/DD/YYYY in English), with a
 * button for the phone's or browser's calendar. YYYYMMDD is taken too. Only a
 * whole day, or nothing, reaches `onChange`; anything else stays in the
 * field, marked.
 *
 * @param {string} value     'YYYY-MM-DD', or '' for none; what onChange gets too
 * @param {string} className classes of the text field, as the form's other fields have
 * Other props (id, required, disabled…) go to the text field.
 */
const DateField = ({ value, onChange, className, disabled, ...props }) => {
  const { t } = useTranslation();
  const [text, setText] = useState(value || "");
  // Follow the value when it changes from outside (a form loaded, a reset).
  useEffect(() => {
    if (parseDay(text) !== (value || "")) setText(value || "");
  }, [value]);
  const wrong = parseDay(text) === null;
  const take = (next) => {
    setText(next);
    const parsed = parseDay(next);
    if (parsed !== null && parsed !== (value || "")) onChange(parsed);
  };
  return (
    <div>
      <div className="relative">
        <input
          {...props}
          type="text"
          inputMode="numeric"
          maxLength={10}
          placeholder={t("dateFieldPlaceholder")}
          value={text}
          disabled={disabled}
          aria-invalid={wrong || undefined}
          onChange={(e) => take(e.target.value)}
          onBlur={() => { const parsed = parseDay(text); if (parsed) setText(parsed); }}
          className={`${className} w-full box-border pr-11 ${wrong ? "border-red-500" : ""}`}
        />
        {/* The browser's own date field lies unseen over the calendar icon,
            so a tap lands on it: a phone (iOS) opens its picker only for a
            tap on the field itself, never for showPicker() on a hidden one.
            A computer opens it on the click through showPicker(). */}
        <span className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-500">
          <CalendarDaysIcon className="w-5 h-5" aria-hidden="true" />
          <input
            type="date"
            tabIndex={-1}
            aria-label={t("dateFieldOpenCalendar")}
            disabled={disabled}
            value={parseDay(text) || ""}
            onChange={(e) => take(e.target.value)}
            onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) { /* opens by itself */ } }}
            className="absolute inset-0 w-full h-full opacity-0 border-0 p-0 m-0 cursor-pointer text-base"
          />
        </span>
      </div>
      {wrong && <p className="text-red-500 mt-1 text-sm">{t("dateFieldWrong")}</p>}
    </div>
  );
};

DateField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};

DateField.defaultProps = {
  value: "",
  className: "",
  disabled: false,
};

export default DateField;
