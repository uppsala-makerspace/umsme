import React from "react";

export default function MainContent({ className = "", topPadding = true, children }) {
  const styles = `
    flex flex-col mx-auto w-full max-w-xl
    px-[2%] ${topPadding ? "pt-3" : ""}
    ${className}
  `.replace(/\s+/g, " ").trim();

  return <div className={styles}>{children}</div>;
}
