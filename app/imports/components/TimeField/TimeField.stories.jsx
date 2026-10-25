import React, { useState } from "react";
import TimeField from "./TimeField";

const Controlled = ({ value: initial, ...props }) => {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ width: 300 }}>
      <TimeField {...props} value={value} onChange={setValue} className="border border-gray-300 rounded p-3" />
      <p>Value: {value || "(none)"}</p>
    </div>
  );
};

export default {
  title: "Components/TimeField",
  component: TimeField,
  render: (args) => <Controlled {...args} />,
};

export const Empty = { args: { value: "" } };
export const WithTime = { args: { value: "18:00" } };
export const Disabled = { args: { value: "18:00", disabled: true } };
