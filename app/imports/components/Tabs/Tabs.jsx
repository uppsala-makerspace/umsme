import React from "react";
import PropTypes from "prop-types";

const Tabs = ({ tabs, activeTab, onTabChange }) => (
  <div className="flex border-b border-gray-200 mb-6">
    {tabs.map((tab) => (
      <button
        key={tab.key}
        className={`flex-1 py-3 px-4 text-[0.95rem] cursor-pointer -mb-px transition-colors focus:outline-none ${
          activeTab === tab.key
            ? "text-[#5fc86f] border-b-[3px] border-[#5fc86f] font-semibold"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        }`}
        onClick={() => onTabChange(tab.key)}
      >
        {tab.label}
        {tab.badge != null && (
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 ml-2 bg-violet-500 text-white rounded-full text-xs font-semibold">
            {tab.badge}
          </span>
        )}
      </button>
    ))}
  </div>
);

Tabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      badge: PropTypes.number,
    })
  ).isRequired,
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
};

export default Tabs;
