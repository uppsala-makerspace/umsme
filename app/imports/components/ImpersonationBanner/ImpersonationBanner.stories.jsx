import ImpersonationBanner from "./ImpersonationBanner";

export default {
  title: "Components/ImpersonationBanner",
  component: ImpersonationBanner,
  tags: ["autodocs"],
  args: { onSwitchBack: () => {} },
};

export const Default = { args: { name: "Anna Andersson" } };
export const LongName = { args: { name: "Maria-Christina Johansson-Lindqvist von Essen" } };
export const SwitchingBack = { args: { name: "Anna Andersson", busy: true } };
