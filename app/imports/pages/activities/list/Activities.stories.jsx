import React, { useState } from "react";
import Activities, { NO_WORKSHOP } from "./Activities";
import { intro, fika } from "../components/fixtures";

const Filtered = ({ workshops: initialWorkshops, categoryIds: initialCategories, ...props }) => {
  const [filter, setFilter] = useState({ workshops: initialWorkshops, categoryIds: initialCategories });
  return <Activities {...props} workshops={filter.workshops} categoryIds={filter.categoryIds} onFilter={setFilter} />;
};

export default {
  title: "Pages/Activities/List",
  component: Activities,
  render: (args) => <Filtered {...args} />,
  args: {
    workshops: [],
    categoryIds: [],
    activities: [
      { ...intro, categoryId: "c1", imageUrl: "https://placehold.co/600x300?text=Introduktion", plannedEvents: 2 },
      { ...fika, categoryId: "c2", plannedEvents: 0 },
    ],
    categories: [{ _id: "c1", name: { sv: "Kurs och introduktion" } }, { _id: "c2", name: { sv: "Socialt" } }],
    canCreateActivity: true,
  },
};

export const All = {};
export const AtNoWorkshop = { args: { workshops: [NO_WORKSHOP] } };
export const ReadOnly = { args: { canCreateActivity: false } };
export const Empty = { args: { activities: [] } };
export const Loading = { args: { loading: true } };
