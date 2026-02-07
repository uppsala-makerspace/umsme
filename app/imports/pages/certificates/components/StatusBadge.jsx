import React from "react";

const variantClasses = {
  valid: "bg-green-100 text-green-800",
  confirmed: "bg-green-100 text-green-800",
  expired: "bg-gray-100 text-gray-500",
  pending: "bg-amber-100 text-amber-800",
  attempt: "bg-amber-100 text-amber-800",
};

const StatusBadge = ({ variant, small, className = "", children }) => {
  const size = small ? "py-0.5 px-2" : "py-1 px-3";
  const colors = variantClasses[variant] || variantClasses.pending;

  return (
    <span
      className={`inline-block text-xs font-semibold rounded-full ${size} ${colors} ${className}`}
    >
      {children}
    </span>
  );
};

export default StatusBadge;
