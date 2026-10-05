# Groups, Workshops and Areas of Interest (Grupper, verkstäder och intresseområden)

A **workshop** (verkstad) is a space with tools and machines for a certain kind
of making. An **area of interest** (intresseområde) is something coordinated
around an interest, such as vinyl cutting or Saturday courses. It usually
spans rooms that belong to several workshops. Nobody joins either one: they
describe what you can do here, and every member may use them.

A **group** (grupp) is a set of members with a shared responsibility. Members
join groups. Every workshop and every area of interest is run by exactly one
steering group.

## Workshops and areas of interest

Workshops and areas of interest are the same kind of thing and have the same
parts:
- a text, an image, rules, guides and a Slack channel
- spaces on the map
- certificates
- a steering group, with responsibility groups under it

The difference lies in the requirements. A workshop is a room that has to be
kept in order. It needs a name ending in *verkstad* and a steering group of at
least two. An area of interest occupies no room of its own, so one person in its
steering group is enough and the name is free. Both also need a description,
an image and a Slack channel before they count as complete. Admin shows what
is missing.

Both have a status: **forming** (blivande), **on trial** (på prov),
**established** (etablerad) or **decommissioned** (avvecklad).

In the app, the Workshops tab switches between **Verkstäder** and
**Intresseområden**. On the map, an area of interest is listed in the popups of
the rooms it uses. A room's workshop is still the main entry there.

## The three group types

| Type | Purpose | Example |
|---|---|---|
| **Steering group** (styrgrupp) | Runs a workshop or an area of interest | Styrgrupp keramik, Lördagskurser handledare |
| **Responsibility group** (ansvarsgrupp) | Looks after one area inside it; always a subgroup of a steering group | Ugnsgruppen within ceramics |
| **Function group** (funktionsgrupp) | Runs something the whole association needs | IT, Städ, Kiosk, Trivsel |

Steering and responsibility groups show up as part of their workshop or
area of interest. Function groups stand on their own, with their own spaces on the
map and their own guides. They can be linked to the workshops and areas
of interest they use.

## Who maintains the information

Every group has a **group responsible** (gruppansvarig). In the app, the
responsible can edit the group's description, rules, Slack channel, guides link
and image.

The **steering group** is the exception. It is run collectively, so **every
active member** may edit the group. The same members may also edit the
description, rules, Slack channel, guides link and image of the workshop or
area of interest it runs. A responsibility group's members cannot edit the
workshop, and neither can its responsible.

Admin and the board can edit everything. Only they can change name, type,
status, spaces, who is responsible, and how members get in.

## Membership

Joining a group requires an active makerspace membership. Each group decides
how people get in:

- **Open**: anyone may join directly.
- **By request**: the request is approved either by any group member or only by
  the group responsible.
- **Closed**: members cannot ask to join. Someone who may approve adds them in
  person, using their member number. This is typical for steering groups.

Only the group responsible (or admin/board) can remove others from the group.
The responsible cannot leave until someone else has taken over the role.

Only the group's members see who else is in it. Everyone else sees the number
of members and who is responsible.

## What group membership gives

- **Roles**: a group can be linked to a system role, for example the board.
  Membership in the group then decides who holds the role.
- **Expense accounts**: members of a group may make expenses on the group's
  expense accounts. See [expenses.md](expenses.md). The accounts of a
  workshop or area of interest belong to its steering group, so only the people
  running it spend on them.
- **Visibility**: established and trial workshops and areas of interest are
  presented on the public website. Function groups are published there too.
  Steering and responsibility groups show only through what they run. See
  `PUBLIC_API_FOR_WEBSITE.md`.

Certificates are shown on the page of a workshop or area of interest. The right to
certify is set per certificate and does not come from group membership.

---

Rules: `common/lib/groupRules.js`. App permissions: `app/server/methods/groups.js`
and `workshops.js`. Policy draft: `inbox/Riktlinjer.md`.
