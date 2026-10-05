# Groups and Workshops (Grupper och verkstäder)

A **workshop** (verkstad) is a space with tools and machines for a certain kind
of making. It is open to every member: nobody joins a workshop.

A **group** (grupp) is a set of members with a shared responsibility or
interest. Members join groups, and every workshop is cared for by exactly one
group.

## The four group types

| Type | Purpose | Example |
|---|---|---|
| **Steering group** (styrgrupp) | Runs a workshop, or governs an interest or function group | Keramikverkstadens styrgrupp |
| **Responsibility group** (ansvarsgrupp) | Looks after one area inside a workshop; always a subgroup of a steering group | Ugnsgruppen within ceramics |
| **Function group** (funktionsgrupp) | Runs something the whole association needs | IT, Städ, Kiosk, Trivsel |
| **Interest group** (intressegrupp) | Gathers around a shared interest | Modelljärnväg, Bike kitchen |

Steering and responsibility groups belong to a workshop and show up as part of
it. Function and interest groups stand on their own, with their own spaces on
the map and their own guides. They can also be linked to workshops they use,
and can have a steering group of their own (see below).

## Who maintains the information

Every group has a **group responsible** (gruppansvarig). In the app, the
responsible can edit the group's description, rules, Slack channel, guides link
and image.

The **steering group** is the exception. It is run collectively, so **every
active member** may edit the group, and the workshop's description, rules,
Slack channel, guides link and image as well. A responsibility group's members
cannot edit the workshop, and neither can its responsible.

An **interest or function group with a steering group** is governed by the
steering group's members: they edit it, approve join requests and remove
members, just like its responsible. This is how more people than the
responsible get to run such a group, without giving rights to everyone in it.

Admin and the board can edit everything. Only they can change name, type,
workshop status, spaces, who is responsible, and how members get in.

## Membership

Joining a group requires an active makerspace membership. Each group decides
how people get in:

- **Open**: anyone may join directly.
- **By request**: the request is approved either by any group member or only by
  the group responsible.
- **Closed**: members cannot ask to join. Someone who may approve adds them in
  person, using their member number. This is typical for steering groups.

Only the group responsible, its steering group (if any) or admin/board can
remove others from the group.
The responsible cannot leave until someone else has taken over the role.

Only the group's members see who else is in it. Everyone else sees the number
of members and who is responsible.

## What group membership gives

- **Roles**: a group can be linked to a system role, for example the board.
  Membership in the group then decides who holds the role.
- **Expense accounts**: members of a group may make expenses on the group's
  expense accounts. See [expenses.md](expenses.md). An account that only a few
  people in an interest or function group should spend on belongs to its
  steering group. The steering group's members see it on the governed group's
  page as well.
- **Visibility**: workshops (established or on trial) and interest groups are
  presented on the public website. Function groups are also published there
  today, although the guideline says they are app-only. Steering and
  responsibility groups only show through their workshop.

Certificates are shown on a workshop's page, but the right to certify is set
per certificate and does not come from group membership.

## Workshop status

A workshop is **forming** (blivande), **on trial** (på prov), **established**
(etablerad) or **decommissioned** (avvecklad). It counts as complete when it has
a description, an image, a Slack channel and a steering group with at least two
members. Admin shows what is missing.

---

Rules: `common/lib/groupRules.js`. App permissions: `app/server/methods/groups.js`
and `workshops.js`. Policy draft: `inbox/Riktlinjer.md`.
