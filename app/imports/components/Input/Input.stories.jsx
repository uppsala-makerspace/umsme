import { fn } from "storybook/test";
import Input from "./Input";

export default {
  title: "Components/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    error: { control: "text" },
    type: {
      control: "select",
      options: ["text", "email", "password", "tel", "number"],
    },
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
  },
  args: {
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: "300px" }}>
        <Story />
      </div>
    ),
  ],
};

export const WithLabel = {
  args: {
    label: "Email",
    id: "email",
    type: "email",
    placeholder: "name@example.com",
  },
};

export const WithoutLabel = {
  args: {
    type: "email",
    placeholder: "name@example.com",
  },
};

export const Password = {
  args: {
    label: "Password",
    id: "password",
    type: "password",
    placeholder: "Enter password",
  },
};

export const WithError = {
  args: {
    label: "Confirm Password",
    id: "confirm-password",
    type: "password",
    error: "Passwords do not match",
  },
};

export const NumberInput = {
  args: {
    label: "Birth Year",
    id: "birthyear",
    type: "number",
    placeholder: "1990",
    min: "1900",
    max: "2026",
  },
};

export const TelInput = {
  args: {
    label: "Mobile",
    id: "mobile",
    type: "tel",
    placeholder: "0701234567",
  },
};

export const AllVariants = {
  render: () => (
    <div className="flex flex-col w-72">
      <Input label="Name" id="name" type="text" placeholder="First Last" />
      <Input label="Email" id="email" type="email" placeholder="name@example.com" />
      <Input label="Password" id="password" type="password" />
      <Input label="Confirm Password" id="confirm" type="password" error="Passwords do not match" />
      <Input type="email" placeholder="No label input" />
    </div>
  ),
};
