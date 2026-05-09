import LiabilityPage from "/imports/pages/liability/Liability";
import { withLayout } from "./decorators";
import { dates, liabilityText } from "./fixtures";

export default {
  title: "Tutorial/Liability",
  component: LiabilityPage,
  decorators: [withLayout],
};

// Filename: liability-{lang}.png — the read-and-approve page, not yet approved.
export const Liability = {
  args: {
    documentDate: dates.liabilityDocumentDate,
    text: liabilityText,
    approvedDate: null,
    loading: false,
    approving: false,
    onApprove: () => {},
  },
  parameters: { tutorial: { path: "/liability", file: "liability" } },
};
