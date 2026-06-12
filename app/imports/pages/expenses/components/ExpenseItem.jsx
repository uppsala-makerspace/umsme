import React from "react";
import { Link } from "react-router-dom";

const statusClasses = {
  pending: "border-l-4 border-l-amber-500",
  submitted: "border-l-4 border-l-blue-500",
  rejected: "border-l-4 border-l-red-500 bg-red-50",
  confirmed: "border-l-4 border-l-[#5fc86f]",
  reimbursed: "border-l-4 border-l-gray-400 bg-green-50",
};

const ExpenseItem = ({ to, status, children }) => {
  const base = "mb-3 rounded-lg bg-white border border-gray-200";
  const statusCls = statusClasses[status] || "";

  return (
    <li className={`${base} ${statusCls}`}>
      <Link
        to={to}
        className="flex justify-between items-center p-4 no-underline text-inherit transition-colors hover:bg-gray-50"
      >
        <div className="flex-1 min-w-0">{children}</div>
        <span className="text-gray-400 text-xl ml-2">&rarr;</span>
      </Link>
    </li>
  );
};

export default ExpenseItem;
