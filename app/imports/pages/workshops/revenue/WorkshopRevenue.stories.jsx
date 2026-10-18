import WorkshopRevenue from "./WorkshopRevenue";

const d = (iso) => new Date(iso);

const clay = { sv: "Lera, 10 kg", en: "Clay, 10 kg" };
const glaze = { sv: "Glasyr", en: "Glaze" };

const baseData = {
  workshop: { _id: "w1", name: { sv: "Keramikverkstaden", en: "Ceramics workshop" }, kind: "workshop" },
  availableYears: [2026, 2025],
  year: 2026,
  total: 1450,
  count: 4,
  items: [{ _id: "clay", name: clay, sharedWith: [], count: 4, total: 1450 }],
  payments: [
    { _id: "p1", date: d("2026-09-12"), amount: 400, comment: "Två säckar till drejkursen", itemId: "clay", itemName: clay },
    { _id: "p2", date: d("2026-08-03"), amount: 250, comment: "", itemId: "clay", itemName: clay },
    { _id: "p3", date: d("2026-05-21"), amount: 400, comment: "Kurs vår 2026", itemId: "clay", itemName: clay },
    { _id: "p4", date: d("2026-02-14"), amount: 400, comment: "Stengodslera", itemId: "clay", itemName: clay },
  ],
};

export default {
  title: "UMSAPP/WorkshopRevenue",
  component: WorkshopRevenue,
  parameters: {},
  tags: ["autodocs"],
};

export const OneItem = {
  args: { data: baseData },
};

export const SeveralItemsOneShared = {
  args: {
    data: {
      ...baseData,
      total: 1690,
      count: 6,
      items: [
        { _id: "clay", name: clay, sharedWith: [], count: 4, total: 1450 },
        { _id: "glaze", name: glaze, sharedWith: ["Måleriet"], count: 2, total: 240 },
      ],
      payments: [
        { _id: "p5", date: d("2026-10-01"), amount: 120, comment: "", itemId: "glaze", itemName: glaze },
        ...baseData.payments.slice(0, 2),
        { _id: "p6", date: d("2026-06-10"), amount: 120, comment: "Blå glasyr", itemId: "glaze", itemName: glaze },
        ...baseData.payments.slice(2),
      ],
    },
  },
};

export const NoSalesThisYear = {
  args: {
    data: { ...baseData, availableYears: [2025], total: 0, count: 0, payments: [], items: [{ ...baseData.items[0], count: 0, total: 0 }] },
  },
};

export const NoItemsLinked = {
  args: { data: { ...baseData, items: [], payments: [], total: 0, count: 0, availableYears: [] } },
};

export const Loading = {
  args: { loading: true },
};

export const NotAllowed = {
  args: { error: "Only the workshop's steering group may see its sales" },
};
