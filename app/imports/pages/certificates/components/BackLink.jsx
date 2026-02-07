import React from "react";
import { Link } from "react-router-dom";

const BackLink = ({ to = "/certificates", state, children }) => (
  <Link
    to={to}
    state={state}
    className="inline-block text-[#5fc86f] no-underline mb-4 text-sm hover:underline"
  >
    &larr; {children}
  </Link>
);

export default BackLink;
