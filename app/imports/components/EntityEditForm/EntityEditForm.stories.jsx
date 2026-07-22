import EntityEditForm from "./index";

export default {
  title: "Components/EntityEditForm",
  component: EntityEditForm,
};

export const Group = {
  args: {
    name: "Trägruppen",
    imageUrl: "https://placehold.co/800x400?text=Tr%C3%A4gruppen",
    values: {
      descriptionSv: "Vi ansvarar för träverkstaden.",
      descriptionEn: "We care for the wood workshop.",
      slackChannel: "träverkstaden",
    },
    showGuidesUrl: false,
  },
};

export const Workshop = {
  args: {
    name: "Träverkstad",
    imageUrl: "https://placehold.co/800x400?text=Tr%C3%A4verkstad",
    values: {
      descriptionSv: "Snickra, svarva och bygg i trä.",
      descriptionEn: "Woodworking.",
      slackChannel: "träverkstaden",
      guidesUrl: "https://tutorial.uppsalamakerspace.se/wood/",
    },
    showGuidesUrl: true,
  },
};

export const NoImage = {
  args: {
    name: "Keramikgruppen",
    imageUrl: null,
    values: { descriptionSv: "Dreja och bränn.", slackChannel: "keramik" },
    showGuidesUrl: false,
  },
};

export const Saving = {
  args: {
    ...Group.args,
    saving: true,
  },
};
