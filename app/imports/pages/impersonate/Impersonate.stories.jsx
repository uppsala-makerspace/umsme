import Impersonate from "./Impersonate";

export default {
  title: "UMSAPP/Impersonate",
  component: Impersonate,
  tags: ["autodocs"],
  args: {
    query: "",
    onQueryChange: () => {},
    onSearch: () => {},
    onSwitch: () => {},
  },
};

const results = [
  { memberId: "m1", mid: "1042", name: "Anna Andersson", email: "anna@example.com", userId: "u1" },
  { memberId: "m2", mid: "1187", name: "Anders Berg", email: "anders.berg@example.com", userId: "u2" },
  { memberId: "m3", mid: "1203", name: "Annika Ek", email: "annika@example.com", userId: null },
];

export const Empty = {};
export const Results = { args: { query: "an", results } };
export const NoResults = { args: { query: "zzz", results: [] } };
export const Searching = { args: { query: "an", searching: true } };
export const Switching = { args: { query: "an", results, switchingTo: "u1" } };
export const WithError = { args: { query: "an", error: "Endast admin-kontot får byta användare." } };
