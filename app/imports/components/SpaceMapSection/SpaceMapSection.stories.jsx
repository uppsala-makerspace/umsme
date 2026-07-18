import { HashtagIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import SpaceMapSection from "./index";
import InfoCard from "../InfoCard";

const space = (spaceId, label, floor = "floor1") => ({
  spaceId,
  floor,
  iconUrl: `https://placehold.co/96x96?text=${label}`,
});

const cards = (
  <>
    <InfoCard href="#" Icon={HashtagIcon} title="Slack-kanal" subtitle="#kanalen" />
    <InfoCard to="/tool" Icon={MagnifyingGlassIcon} title="Sök verktyg" />
  </>
);

export default {
  title: "Components/SpaceMapSection",
  component: SpaceMapSection,
};

export const OneSpace = {
  args: {
    mapView: {
      floor: "floor1",
      primarySpaceId: "woodworkshop",
      spaces: [space("woodworkshop", "primary")],
    },
    children: cards,
  },
};

export const TwoSpaces = {
  args: {
    mapView: {
      floor: "floor1",
      primarySpaceId: "woodworkshop",
      spaces: [space("woodworkshop", "primary"), space("CNCworkshop", "sec1")],
    },
    children: cards,
  },
};

export const FiveSpaces = {
  args: {
    mapView: {
      floor: "floor1",
      primarySpaceId: "woodworkshop",
      spaces: [
        space("woodworkshop", "primary"),
        space("CNCworkshop", "sec1"),
        space("3dworkshop", "sec2"),
        space("metalworkshop", "sec3"),
        // On the other floor: shown after switching floors in the mini map.
        space("textiles_workshop", "sec4", "floor2"),
      ],
    },
    children: cards,
  },
};

export const WithoutMapView = {
  args: {
    mapView: null,
    children: cards,
  },
};
