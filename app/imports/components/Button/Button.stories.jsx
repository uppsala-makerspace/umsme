import { fn } from "storybook/test";
import Button from "./Button";

export default {
  title: "Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "social"],
    },
    fullWidth: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
  },
  args: {
    onClick: fn(),
  },
};

// Primary button - main actions
export const Primary = {
  args: {
    variant: "primary",
    children: "Login",
  },
};

export const PrimaryFullWidth = {
  args: {
    variant: "primary",
    fullWidth: true,
    children: "Login",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "300px" }}>
        <Story />
      </div>
    ),
  ],
};

export const PrimaryDisabled = {
  args: {
    variant: "primary",
    disabled: true,
    children: "Login",
  },
};

// Secondary button - secondary actions
export const Secondary = {
  args: {
    variant: "secondary",
    children: "Cancel",
  },
};

export const SecondaryFullWidth = {
  args: {
    variant: "secondary",
    fullWidth: true,
    children: "Cancel",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "300px" }}>
        <Story />
      </div>
    ),
  ],
};

export const SecondaryDisabled = {
  args: {
    variant: "secondary",
    disabled: true,
    children: "Cancel",
  },
};

// Social button - for OAuth login
export const Social = {
  args: {
    variant: "social",
    children: (
      <>
        <img src="/images/GoogleLogo.png" alt="Google" className="w-6 h-6" />
        Continue with Google
      </>
    ),
  },
};

export const SocialFullWidth = {
  args: {
    variant: "social",
    fullWidth: true,
    children: (
      <>
        <img src="/images/GoogleLogo.png" alt="Google" className="w-6 h-6" />
        Continue with Google
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: "300px" }}>
        <Story />
      </div>
    ),
  ],
};

export const SocialDisabled = {
  args: {
    variant: "social",
    disabled: true,
    children: (
      <>
        <img src="/images/GoogleLogo.png" alt="Google" className="w-6 h-6" />
        Continue with Google
      </>
    ),
  },
};

// All variants together for comparison
export const AllVariants = {
  render: () => (
    <div className="flex flex-col gap-4 w-64">
      <Button variant="primary">Primary Button</Button>
      <Button variant="secondary">Secondary Button</Button>
      <Button variant="social">
        <img src="/images/GoogleLogo.png" alt="Google" className="w-6 h-6" />
        Social Button
      </Button>
    </div>
  ),
};
