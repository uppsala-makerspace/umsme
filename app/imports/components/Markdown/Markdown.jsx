import React from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import "./markdownStyle.css";

const Markdown = ({ children, className }) => {
  if (!children) return null;

  const html = DOMPurify.sanitize(marked.parse(children, { breaks: true }));

  return (
    <div
      className={`markdown-content${className ? ` ${className}` : ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default Markdown;
