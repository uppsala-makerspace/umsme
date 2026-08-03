import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";

/**
 * Multi-select filter: a trigger of the caller's choosing plus a popover of
 * checkboxes. A native <select multiple> can't be made to look or behave like
 * one on a phone, hence the hand-rolled popover — the same outside-click
 * pattern as PlaceAutocomplete.
 *
 * The trigger is a render prop because the two callers look nothing alike: the
 * expense account page uses a full-width button showing a summary of the
 * selection, the group list a bare icon button.
 */
const CheckboxDropdown = ({
  options,
  selected,
  onToggle,
  renderTrigger,
  align = "left",
  panelClassName = "",
  accentClassName = "accent-[#5fc86f]",
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleOpen = () => setOpen((prev) => !prev);

  return (
    <div ref={wrapRef} className="relative">
      {renderTrigger({ open, toggle: toggleOpen })}
      {open && (
        <div
          className={`absolute top-full mt-1 z-20 bg-white border border-gray-300 rounded-lg shadow-lg p-1 ${
            align === "right" ? "right-0" : "left-0"
          } ${panelClassName}`}
        >
          {options.map((option) => (
            <React.Fragment key={option.key}>
              <label className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selected.includes(option.key)}
                  onChange={() => onToggle(option.key)}
                  className={`w-4 h-4 ${accentClassName}`}
                />
                <span className="whitespace-nowrap">{option.label}</span>
              </label>
              {option.divider && <hr className="my-1 border-gray-200" />}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

CheckboxDropdown.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      // Draw a rule after this option, to set it apart from the rest.
      divider: PropTypes.bool,
    })
  ).isRequired,
  selected: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggle: PropTypes.func.isRequired,
  renderTrigger: PropTypes.func.isRequired,
  align: PropTypes.oneOf(["left", "right"]),
  panelClassName: PropTypes.string,
  accentClassName: PropTypes.string,
};

export default CheckboxDropdown;
