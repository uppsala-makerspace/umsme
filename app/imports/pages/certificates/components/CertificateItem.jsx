import React from "react";
import { Link } from "react-router-dom";

const statusClasses = {
  pending: "border-l-4 border-l-amber-500",
  valid: "border-l-4 border-l-[#5fc86f]",
  expired: "border-l-4 border-l-gray-400 opacity-70",
  available: "border-l-4 border-l-blue-500",
  "to-confirm": "border-l-4 border-l-violet-500",
  confirmed: "border-l-4 border-l-[#5fc86f] bg-green-50",
};

const CertificateItem = ({ to, status, mandatory, children }) => {
  const base = "mb-3 rounded-lg bg-white border border-gray-200";
  const statusCls = statusClasses[status] || "";
  const mandatoryCls = mandatory ? "bg-yellow-50 border-yellow-300" : "";

  return (
    <li className={`${base} ${statusCls} ${mandatoryCls}`}>
      <Link
        to={to}
        className="flex justify-between items-center p-4 no-underline text-inherit transition-colors hover:bg-gray-50"
      >
        <div className="flex-1">{children}</div>
        <span className="text-gray-400 text-xl ml-2">&rarr;</span>
      </Link>
    </li>
  );
};

export default CertificateItem;
