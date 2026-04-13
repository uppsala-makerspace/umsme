import React from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import "./markdownStyle.css";

const Markdown = ({ children, className, startLevel = 1 }) => {
  if (!children) return null;

  const renderer = new marked.Renderer();
  const shift = Math.max(0, startLevel - 1);
  renderer.heading = ({ tokens, depth }) => {
    const level = Math.min(6, depth + shift);
    const text = marked.Parser.parseInline(tokens, { renderer });
    return `<h${level}>${text}</h${level}>\n`;
  };

  const html = DOMPurify.sanitize(
    marked.parse(children, { breaks: true, renderer })
  );

  return (
    <div
      className={`markdown-content${className ? ` ${className}` : ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default Markdown;
