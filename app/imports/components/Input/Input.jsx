import React from "react";

/**
 * Reusable Input component with Tailwind styling.
 *
 * @param {Object} props
 * @param {string} props.label - Optional label text
 * @param {string} props.id - Input id (links label via htmlFor)
 * @param {string} props.error - Optional error message
 * @param {string} props.hint - Optional help under the field, linked by aria-describedby
 * @param {string} props.className - Additional classes on wrapper div
 */
export default function Input({
  label,
  id,
  error,
  hint,
  className = "",
  ...props
}) {
  const inputStyles = `
    bg-surface border border-black rounded
    py-2.5 px-3 text-base font-mono
    w-full box-border
    focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20
  `.replace(/\s+/g, " ").trim();

  // Default bottom margin, unless the caller sets their own mb-* class
  // (Tailwind resolves conflicts by stylesheet order, not class order, so
  // "mb-0" in className would otherwise lose against the default "mb-4").
  const margin = /(^|\s)mb-/.test(className) ? "" : "mb-4";
  return (
    <div className={`w-full ${margin} ${className}`.replace(/\s+/g, " ").trim()}>
      {label && (
        <label htmlFor={id} className="block mb-1 font-bold">
          {label}
        </label>
      )}
      <input id={id} className={inputStyles} aria-describedby={hint && id ? `${id}-hint` : undefined} {...props} />
      {hint && (
        <p id={id ? `${id}-hint` : undefined} className="text-gray-500 mt-1 text-sm">{hint}</p>
      )}
      {error && (
        <p className="text-red-500 mt-1 text-sm">{error}</p>
      )}
    </div>
  );
}
