import React from "react";

export default function MainContent({ className = "", children }) {
  const styles = `
    flex flex-col mx-auto w-full max-w-xl
    px-[2%] pb-[calc(80px+env(safe-area-inset-bottom))]
    ${className}
  `.replace(/\s+/g, " ").trim();

  return <div className={styles}>{children}</div>;
}
