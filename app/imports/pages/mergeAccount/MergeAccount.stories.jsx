import { fn } from "storybook/test";
import MergeAccount from "./MergeAccount";

const info = { state: "ready", kept: "anna@example.com", removed: "anna.old@example.com", member: { name: "Anna Andersson", mid: "1234" } };

export default {
  title: "Pages/MergeAccount",
  component: MergeAccount,
  args: { info, onConfirm: fn() },
};

export const Ready = {};
export const Merged = { args: { result: { merged: true } } };
export const NeedsHelp = {
  args: { info: { ...info, state: "needsHelp", reasons: [{ code: "staffRole" }, { code: "members", details: ["The source member belongs to a family. Disconnect it from the family first."] }] } },
};
export const Used = { args: { info: { state: "used" } } };
export const Invalid = { args: { info: { state: "invalid" } } };
