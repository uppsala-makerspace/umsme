import React from "react";

/**
 * Reusable Input component with Tailwind styling.
 *
 * @param {Object} props
 * @param {string} props.label - Optional label text
 * @param {string} props.id - Input id (links label via htmlFor)
 * @param {string} props.error - Optional error message
 * @param {string} props.className - Additional classes on wrapper div
 */
export default function Input({
  label,
  id,
  error,
  className = "",
  ...props
}) {
  const inputStyles = `
    bg-surface border border-black rounded
    py-2.5 px-3 text-base font-mono
    w-full box-border
    focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20
  `.replace(/\s+/g, " ").trim();

  return (
    <div className={`w-full mb-4 ${className}`.trim()}>
      {label && (
        <label htmlFor={id} className="block mb-1 font-bold">
          {label}
        </label>
      )}
      <input id={id} className={inputStyles} {...props} />
      {error && (
        <p className="text-red-500 mt-1 text-sm">{error}</p>
      )}
    </div>
  );
}
