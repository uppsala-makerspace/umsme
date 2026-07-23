import RulesView from "./index";

export default {
  title: "Components/RulesView",
  component: RulesView,
};

export const Default = {
  args: {
    name: "Träverkstad",
    rules: "## Innan du börjar\n\n- Läs igenom **säkerhetsinstruktionerna**.\n- Bär skyddsglasögon.\n\n## Efter användning\n\n1. Städa efter dig.\n2. Stäng av maskinerna.",
  },
};

export const Loading = {
  args: { loading: true },
};
