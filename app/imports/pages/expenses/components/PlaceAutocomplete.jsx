import React, { useState, useRef, useEffect } from "react";

/**
 * Free-text input with a suggestion dropdown that is exactly as wide as the
 * input (a native <datalist> popup can't be sized via CSS). The dropdown is
 * styled inline so it does not depend on the compiled Tailwind bundle.
 */
export default function PlaceAutocomplete({ value, onChange, suggestions = [], placeholder, className }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const q = (value || "").trim().toLowerCase();
  const filtered = suggestions
    .filter((s) => !q || s.toLowerCase().includes(q))
    .filter((s) => s.toLowerCase() !== q) // nothing to pick if it already matches exactly
    .slice(0, 8);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            width: "100%",
            zIndex: 20,
            margin: "4px 0 0",
            padding: 0,
            listStyle: "none",
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            maxHeight: 240,
            overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          {filtered.map((s) => (
            <li
              key={s}
              // onMouseDown (not onClick) so the input doesn't blur first.
              onMouseDown={(e) => { e.preventDefault(); onChange(s); setOpen(false); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
              style={{ padding: "8px 12px", cursor: "pointer" }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
