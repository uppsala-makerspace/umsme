import React, { useState } from "react";
import DateField from "./DateField";

const Controlled = ({ value: initial, ...props }) => {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ width: 300 }}>
      <DateField {...props} value={value} onChange={setValue} className="border border-gray-300 rounded p-3" />
      <p>Value: {value || "(none)"}</p>
    </div>
  );
};

export default {
  title: "Components/DateField",
  component: DateField,
  render: (args) => <Controlled {...args} />,
};

export const Empty = { args: { value: "" } };
export const WithDay = { args: { value: "2026-11-05" } };
export const Disabled = { args: { value: "2026-11-05", disabled: true } };
