import { HashtagIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import SpaceMapSection from "./index";
import InfoCard from "../InfoCard";

const space = (spaceId, label, onFloor = true) => ({
  spaceId,
  onFloor,
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
        // On another floor: gets an icon card but is not drawn on the map.
        space("textileroom", "sec4", false),
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
