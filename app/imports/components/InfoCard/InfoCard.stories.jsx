import { HashtagIcon, UsersIcon, BookOpenIcon } from "@heroicons/react/24/outline";
import InfoCard from "./index";

export default {
  title: "Components/InfoCard",
  component: InfoCard,
};

export const Grid = {
  render: () => (
    <div className="grid grid-cols-2 gap-3 max-w-md">
      <InfoCard to="/groups/grp1" Icon={UsersIcon} title="Styrgrupp" subtitle="5 medlemmar" />
      <InfoCard href="slack://channel?team=T1&id=C1" Icon={HashtagIcon} title="Slack-kanal" subtitle="#träverkstaden" />
      <InfoCard href="https://tutorial.uppsalamakerspace.se" Icon={BookOpenIcon} title="Guider" />
      <InfoCard to="/expenses" Icon={BookOpenIcon} title="Utlägg" disabled />
    </div>
  ),
};
