import React from "react";

/**
 * Reusable Button component with Tailwind styling.
 *
 * @param {Object} props
 * @param {"primary" | "secondary" | "social" | "danger"} props.variant - Button style variant
 * @param {boolean} props.fullWidth - Whether button should be full width
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Button content
 */
export default function Button({
  variant = "primary",
  fullWidth = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  const baseStyles = `
    font-mono text-base cursor-pointer
    transition-colors duration-150 ease-in-out
    disabled:cursor-not-allowed
    box-border
  `;

  const variantStyles = {
    primary: `
      bg-brand-green text-surface border-none rounded
      hover:bg-brand-green-dark
      disabled:bg-gray-300 disabled:text-gray-500
      py-2.5 px-4
    `,
    secondary: `
      bg-surface text-black border border-black rounded
      hover:bg-gray-200
      disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300
      py-2.5 px-4
    `,
    social: `
      bg-surface text-black border border-black rounded-md
      hover:bg-gray-200
      disabled:bg-surface disabled:text-surface disabled:border-gray-300
      py-3 px-5
      flex items-center justify-center gap-2.5
    `,
    danger: `
      bg-red-500 text-white border-none rounded
      hover:bg-red-600
      disabled:bg-gray-300 disabled:text-gray-500
      py-2.5 px-4
    `,
  };

  const widthStyles = fullWidth ? "w-full" : "";

  const combinedStyles = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${widthStyles}
    ${className}
  `.replace(/\s+/g, " ").trim();

  return (
    <button
      className={combinedStyles}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
