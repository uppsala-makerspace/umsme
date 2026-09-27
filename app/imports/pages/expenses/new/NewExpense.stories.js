import NewExpense from "./NewExpense";

export default {
  title: "UMSAPP/NewExpense",
  component: NewExpense,
};

const actions = {
  onChooseType: (type) => console.log("Chose", type),
  onCapture: (file) => console.log("Captured", file.mimeType),
};

export const ChooseType = { args: { ...actions } };

export const Receipt = { args: { ...actions, type: "receipt" } };

export const Invoice = { args: { ...actions, type: "invoice" } };

export const Uploading = { args: { ...actions, type: "invoice", busy: true } };
