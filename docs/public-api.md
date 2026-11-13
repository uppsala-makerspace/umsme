# Public Directory API

## 1. Overview

UMSME publishes the makerspace's workshops, areas of interest and function
groups, together with the rooms on the floor plans, and the activities and
events, as a single JSON document.
It is what the public website at uppsalamakerspace.se is built from, and any
other service may read it the same way.

The endpoint is served by the admin app and is open: no account, no token.
Only content meant for the public is included (see
[section 4](#4-what-is-published)).

**Source:** `common/lib/publicDirectory.js` (selection and JSON shape),
`common/server/publicDirectoryApi.js` (HTTP handler), mounted in
`admin/server/api/publicDirectory.js`.

---

## 2. Request

```
GET https://umsme.uppsalamakerspace.se/api/public/entries
```

In a development setup the admin app serves it at
`http://localhost:3000/api/public/entries`.

- The endpoint takes no parameters. There is no filtering, search or paging;
  every call returns the whole directory.
- Only `GET` is supported. Other methods get `405`, other paths under
  `/api/public` get `404`.
- Responses carry `Cache-Control: public, max-age=3600` and an `ETag`. Send the
  tag back in `If-None-Match` and an unchanged directory is answered with
  `304 Not Modified` and no body. Polling once an hour is the intended rhythm.

---

## 3. Response

```jsonc
{
  "entries": [ /* workshops, areas of interest, function groups and activities */ ],
  "spaces":  [ /* every room on the two floor plans */ ],
  "palette": { "green": "#5fc86f", "blue": "#5fa8c8", "amber": "#e0b64f",
               "purple": "#b18fd0", "coral": "#e08a6f" },
  "events":     [ /* free-standing events to come */ ],
  "categories": [ /* the categories of activities */ ]
}
```

Content type is `application/json; charset=utf-8`.

### Conventions

- **Missing values are left out, not set to `null`.** A field with no value is
  absent from the object, so test for presence (`"tag" in entry`).
- **Bilingual fields** are objects with `sv` and/or `en`. Either language may be
  missing; the field is absent when both are.
- **Text is Markdown.** `text` fields are the full, raw Markdown description and
  should be rendered by the consumer.
- **Image and icon URLs are absolute** and end in `?v=<fileId>`. The value
  changes whenever the image is replaced, so keep the query string: it is what
  makes the URL safe to cache indefinitely.

### `entries`

```jsonc
{
  "id": "traverkstaden",
  "kind": "workshop",
  "status": "established",
  "name":  { "sv": "Träverkstaden", "en": "Wood workshop" },
  "tag":   { "sv": "Trä", "en": "Wood" },
  "text":  { "sv": "…", "en": "…" },
  "icon":  "https://umsme.uppsalamakerspace.se/api/spaces/<docId>/icon?v=…",
  "image": "https://umsme.uppsalamakerspace.se/api/workshops/<docId>/image?v=…",
  "spaces": [
    { "spaceId": "woodworkshop", "floor": "floor1", "role": "primary",   "color": "green" },
    { "spaceId": "CNCworkshop",  "floor": "floor1", "role": "secondary", "color": "blue"  }
  ]
}
```

| Field    | Type      | Description |
| -------- | --------- | ----------- |
| `id`     | string    | Identifier derived from the Swedish name, unique across all entries. See [Identifiers](#identifiers). |
| `kind`   | string    | `workshop`, `areaOfInterest`, `group` or `activity` (see [Activities](#activities)). |
| `status` | string    | Workshops and areas of interest only: `established` or `trial`. |
| `type`   | string    | Groups only: always `function`. |
| `name`   | bilingual | Display name. |
| `tag`    | bilingual | Short label for listings, e.g. "Textil". |
| `text`   | bilingual | Description in Markdown. |
| `icon`   | URL       | Icon of the entry's primary space. |
| `image`  | URL       | The entry's own picture. |
| `spaces` | array     | The rooms the entry uses, primary first. Absent when it has no primary room. |

Each item in `spaces`:

| Field     | Description |
| --------- | ----------- |
| `spaceId` | The room, as named on the floor plan. |
| `floor`   | `floor1` or `floor2`. |
| `role`    | `primary` for the first item, `secondary` for the rest. |
| `color`   | A key into `palette`. The primary room is always `green`; secondary rooms cycle through `blue`, `amber`, `purple`, `coral`. |

A **workshop** has rooms of its own. An **area of interest** (intresseområde) is
organised around an interest rather than a room, so its spaces are usually
rooms that belong to workshops. A **function group** is a group anyone can join
that does a task for the makerspace as a whole.

### Activities

An activity is something the makerspace does again and again, such as an
introduction or a craft evening; its events are the times it happens. An
entry of kind `activity` has fields of its own instead of `status`, `tag`,
`icon` and the `spaces` array:

```jsonc
{
  "id": "introduktion-traverkstaden",
  "kind": "activity",
  "name":  { "sv": "Introduktion träverkstaden", "en": "Wood workshop introduction" },
  "text":  { "sv": "…" },
  "image": "https://umsme.uppsalamakerspace.se/api/activities/<docId>/image?v=…",
  "category": "kurs-och-introduktion",
  "workshop": "traverkstaden",
  "group": "trivselgruppen",
  "space": { "spaceId": "woodworkshop", "floor": "floor1" },
  "durationMinutes": 120,
  "cost": 50,
  "membersOnly": true,
  "registration": "required",
  "seats": 8,
  "events": [
    { "start": "2026-11-05T17:00:00.000Z", "end": "2026-11-05T19:00:00.000Z", "status": "confirmed",
      "registration": "required", "seats": 8, "seatsLeft": 3, "hosts": ["Anna", "Bo"] },
    { "start": "2026-11-19T17:00:00.000Z", "end": "2026-11-19T19:00:00.000Z", "status": "cancelled",
      "registration": "optional",
      "name": { "sv": "Extra introduktion" }, "space": { "spaceId": "bigroom", "floor": "floor1" } }
  ]
}
```

| Field             | Type      | Description |
| ----------------- | --------- | ----------- |
| `category`        | string    | `id` of one of the `categories`. |
| `workshop`        | string    | `id` of the workshop or area of interest it is shown at: its own, or else its group's (that of the steering group the group is, or is an activity group under). Absent for something of the whole association or of a function group that names none, and when that workshop is not published. |
| `group`           | string    | `id` of the function group that holds it, when that group is published. |
| `space`           | object    | The room, as `(spaceId, floor)`. |
| `durationMinutes` | number    | How long an event usually lasts. |
| `cost`            | number    | What taking part costs, in kronor. Absent when free. |
| `membersOnly`     | boolean   | Whether only members may take part. |
| `registration`    | string    | Whether one signs up: `required`, `optional` or `none`. What its events have unless an event says otherwise. |
| `seats`           | number    | How many may sign up for an event, unless an event says otherwise. Absent when there is no sign-up or no limit. |
| `events`          | array     | Its events from now on, soonest first. Absent when none is planned. |
| `pastEvents`      | array     | Its latest events that are over, latest first: at most 10. The same shape as `events`. Absent when there are none. |

Each item in `events` and `pastEvents` has `start` and `end` (ISO 8601, UTC) and `status`,
`confirmed` or `cancelled`: a cancelled event stays in the list, so that
whoever planned to come can see it is off. An event has a `name` or a `space`
only when they differ from the activity's. Every event also has:

| Field          | Type     | Description |
| -------------- | -------- | ----------- |
| `registration` | string   | Whether one signs up for this event: `required`, `optional` or `none`. |
| `seats`        | number   | How many may sign up. Absent when there is no sign-up or no limit. |
| `seatsLeft`    | number   | How many seats are free now; `0` when full (one can then join the queue, if the event has one). Present together with `seats`. |
| `hosts`        | string[] | The first names of the hosts, who run the event. Only when the activity or the event is set to show them, and the event has hosts; otherwise absent. Nothing else about the hosts is published. |

### `events`

Events that belong to no activity, such as a cleaning day or the annual
meeting, from now on and soonest first. They describe themselves with the
fields an activity has (`name`, `text`, `image`, `category`, `workshop`,
`group`, `space`, `cost`, `membersOnly`, `registration`), plus `start`, `end`,
`status`, `seats` and `seatsLeft` as for an activity's events, and, when set to
show them, `hosts`.
Their `id` is made from the Swedish name and the day, e.g.
`staddag-2026-11-29`, unique among the events.

### `categories`

```jsonc
{ "id": "kurs-och-introduktion", "name": { "sv": "Kurs och introduktion", "en": "Course and introduction" } }
```

The categories of activities, in the order the makerspace wants them shown,
for filtering. Their `id`s follow the same rules as entry `id`s.

### `spaces`

```jsonc
{
  "spaceId": "woodworkshop",
  "floor": "floor1",
  "name": { "sv": "Träverkstaden" },
  "text": { "sv": "…" },
  "icon": "https://umsme.uppsalamakerspace.se/api/spaces/<docId>/icon?v=…",
  "iconSize": 120,
  "workshop": "traverkstaden",
  "areasOfInterest": ["vinylskarning"],
  "groups": ["trivselgruppen"]
}
```

| Field             | Type      | Description |
| ----------------- | --------- | ----------- |
| `spaceId`         | string    | Matches the element ids in the floor plan SVG. |
| `floor`           | string    | `floor1` or `floor2`. |
| `name`            | bilingual | Room name. |
| `text`            | bilingual | Room description in Markdown. |
| `icon`            | URL       | The room's icon (SVG). |
| `iconSize`        | number    | Icon size in SVG user units, when set. |
| `workshop`        | string    | `id` of the workshop the room belongs to. A room has at most one. |
| `areasOfInterest` | string[]  | `id`s of areas of interest active in the room. |
| `groups`          | string[]  | `id`s of function groups using the room. |

Every room is listed, including rooms nothing is linked to. The links in
`spaces` are the reverse of the `spaces` arrays in `entries` and always agree
with them, and they only ever point at entries that are in the same response.

### `palette`

The colours used to mark an entry's rooms on the map, by name. They are the
same values the member app uses, so a consumer need not hardcode them.

### Identifiers

- **A room is identified by the pair `(spaceId, floor)`.** `spaceId` alone is
  not unique: `kitchen` and `entrance` exist on both floors.
- **Entry `id`s follow the Swedish name.** It is lowercased, å/ä/ö become a/a/o
  and other characters become hyphens, so "Trä & Metall" becomes `tra-metall`.
  Clashes get `-2`, `-3`. Renaming an entry changes its `id`, so do not use it
  as a permanent URL without a way to handle that.

---

## 4. What Is Published

| Included | Left out |
| -------- | -------- |
| Workshops and areas of interest with status *established* or *trial* | Those that are *forming* or *decommissioned* |
| Function groups | Steering and responsibility groups, which show only through what they run |
| All rooms on both floors | |
| Activities marked to be shown on the website, and their events to come that are too | Activities and events not marked so, events that are over |
| Free-standing events to come that are marked to be shown | |

No member data is published, with one exception: the first names of an
event's hosts, when the activity or the event is set to show them (the
Visibility section of its form). Nothing else about the hosts, and no other
names of members, group membership or contact details. See [groups-and-workshops.md](groups-and-workshops.md) for
what the statuses and group types mean.

---

## 5. Floor Plans

The floor plans are not part of the response. They are static files of the
member app, readable without login:

```
https://app.uppsalamakerspace.se/images/floor1.svg
https://app.uppsalamakerspace.se/images/floor2.svg
```

Each room appears twice in the SVG:

| Element id         | Element | Use |
| ------------------ | ------- | --- |
| `<spaceId>-floor`  | polygon | The room's outline. Set its `fill` to colour the room. |
| `<spaceId>-marker` | circle  | A placeholder whose `cx`/`cy` is the room's centre, where the icon goes. Hide it. |

The SVGs contain a few elements with no matching room, such as
`ventilationshaft`. Ignore elements that have no entry in `spaces`.

### Drawing the map

To show where an entry is, take its `spaces`, set each `<spaceId>-floor` fill to
`palette[color]`, and grey out the other rooms (the member app uses `#e5e7eb`).
The primary room is a natural default focus.

To place a room's icon, add an `<image href="<icon URL>">` at the marker,
centred: `x = cx - size/2`, `y = cy - size/2`. Referencing the icon rather than
inlining it keeps it a vector image and keeps the icon's own styles from
affecting the floor plan.

Loading the SVG with `<object type="image/svg+xml" data="…">` and editing it
through `contentDocument` after `load` keeps the floor plan's styles separate
from the page.

### Reference implementation

The member app draws the same map from the same data:

| File | Contents |
| ---- | -------- |
| `app/imports/components/FloorMap/index.jsx` | Two stacked floors, switching between them, icon placement, highlighting rooms, and the compact variant used on a workshop page |
| `app/imports/components/FloorMap/floorMapStyle.css` | The stacked layout: offsets, scale, opacity and transitions |
| `app/imports/components/FloorMap/RoomPopup.jsx` | What is shown when a room is clicked: the workshop first, then areas of interest and groups |
| `common/lib/spaceColors.js` | The palette and the colour rule for primary and secondary rooms |

The highlight is a CSS `@keyframes` animation with only a `50%` step, added to
the SVG document. It pulses from the room's current fill and back without
needing to know that colour.
