# Monolithic Design Revisited

UMSME is one system made of three Meteor applications (`admin/`, `app/`,
`payment/`) sharing one MongoDB database and one body of shared code
(`common/`). Two outside systems build on it: the tutorial site, generated from
`tutorial/` in this repository, and the public website, which reads the
directory API served by admin (see [public-api.md](public-api.md)).

As the system grows, the question is whether new features should keep being
built into this whole, or whether some of them should become systems of their
own. This document sets out the arguments and the position we have taken.

## 1. Where the system is today

What began as membership administration now covers a range of features that
are small on their own but connected to each other:

- membership, payments through Swish and Bankgiro, and renewals
- door access, certificates and tests
- storage, and the web shop
- workshops, areas of interest, groups and spaces
- expenses, with approvers, budgets and bookkeeping export
- messages, mail, push notifications and Slack events to managers

Some are larger than others, notably workshops and groups, and expenses. All of
them are reached by members in one place, the app, with fuller administration
in admin.

The guiding idea has been that a member should not need to use several systems.
The one outside system members rely on besides the app is Slack. It stays
outside on purpose: it is a large product in its own right, and works better as
a native app than anything a PWA could offer.

## 2. What is coming

Four larger features are planned. Their design is out of scope here:

1. **Activities** and their occasions, with registration
2. **Tasks**, where members propose, get approval for, take on and complete
   work on the premises, today largely handled by the board
3. **Frequently asked questions** per workshop, area of interest and the
   association as a whole, as a shared knowledge base
4. **An AI agent** that answers questions from several sources, available in
   Slack, on the website and in the app

The question is whether 1–3, and 4, belong in the current system.

## 3. The case for separate systems

Splitting features out has real advantages, and they should be weighed fairly.

- **Smaller units.** Each codebase is easier to understand, test and deploy on
  its own. A change to tasks cannot break payments.
- **Independent release and failure.** A separate service can be released, scaled
  and restarted without touching the others. If it goes down, the rest keeps
  running.
- **Freedom of technology.** A part with different needs can use a different
  stack, without being held to Meteor's release cycle.
- **Clear ownership.** A separate system can be handed to another volunteer or
  group with a clear boundary around it.

## 4. The obstacles

### 4.1 Authorization, not just authentication

Sharing login between systems is a solved problem. Sharing **authorization** is
not, and the planned features depend on it throughout. Typical rules:

- only someone in a workshop's steering group may create an activity, a task
  or a question for that workshop, or it stays a draft until someone in the
  steering group approves it
- the board, admin and the treasurer may act across all workshops
- some activities require a valid certificate to register
- some things are only for members with an active membership, or lab access

The facts these rules rest on are core data that changes all the time: group
memberships and their state, who is responsible, roles, membership periods,
certificates. A separate system has three ways to reach them, each with a cost:

| Approach | What it means | The cost |
| --- | --- | --- |
| Share the database | The new system reads `groupMemberships`, `members` and so on directly | The same coupling as today, now spread over two codebases and two deployments. A distributed monolith, which is worse than a monolith. |
| Ask the core | The new system calls the core system: "may member X create in workshop Y?" | A network dependency on every decision, an API to version, and a question of what happens when the core is down. |
| Carry permissions in the token | Group memberships and roles travel with the login | Stale the moment someone leaves a steering group. Needs short lifetimes and reissuing. |

Dedicated authorization services exist, built on relation tuples synced from
the source of truth. They are designed for organisations with many teams and
services, and would be out of proportion here.

### 4.2 A seamless experience

Members should not notice which system they are using. With separate services,
the app must either call several backends or have its server forward calls to
them. Either way, one screen depends on more moving parts, and loading, errors
and offline behaviour have to be handled across them.

### 4.3 Shared machinery

Much of what a new feature needs already exists as shared code:

- push notifications and mail, with the recipient whitelist used in development
- Slack events to managers
- image storage
- the member lookup from a login

A separate system would have to duplicate these, or they would have to become
services in their own right.

### 4.4 Data care across systems

Operations on members span everything that refers to them. Merging two duplicate
members points every reference at the one kept (see the merge tool and the list
of moved fields in [data-model.md](data-model.md)). Deleting a member, or
answering a request for their data, works the same way. Within one database this
is one operation. Across systems it becomes a coordinated, multi-step one, with
partial failures to handle.

### 4.5 Operational load

Every system needs upgrades, monitoring, backups and someone who knows it. For
a project carried by a few volunteers, the number of systems is itself a risk.

## 5. When separation is right

A part is a good candidate for its own system when it:

- needs a different technology or has different running costs
- has a different pace of change
- mostly **reads** knowledge rather than making authorization decisions on
  core data

The AI agent fits all three. It uses a different stack and has its own costs,
it serves three channels (Slack, the website and the app), and it consumes
knowledge without owning core data. If it answers only from content that is
public or open to all members, it avoids the authorization question entirely.

The pattern already exists: the tutorial site and the public website are built
on read-only projections of the core, served without parameters and cached by
the consumer. The agent can be fed the same way.

Activities, tasks and questions are the opposite case. They are about members
acting on behalf of workshops and groups, so they make authorization decisions
on core data all the time, and they link to each other: a task may become an
activity, a question may come out of a task.

## 6. Position

- **Activities, tasks and frequently asked questions stay in the current
  system**, on the same database. Members use them in the app, with fuller
  administration in admin.
- **The AI agent is a separate system**, fed by read-only APIs from the core.

## 7. Keeping the monolith healthy

What makes a large system hard to work with is usually unclear boundaries rather
than size. To keep the whole manageable:

1. **One authorization module.** The rules are scattered today: functions
   deciding who may edit a workshop or see its revenue, expense approval, and
   deny rules on individual collections. Gather them as pure, tested functions
   of the form "may this member do this action on this resource". If anything
   is split out later, this module is the API it would use.
2. **One draft and approval flow.** Activities, tasks and questions share a
   shape: a draft, approval by the steering group, then publication. Expenses
   have a variant already. Build it once rather than three times.
3. **Domains that own their collections.** Each feature keeps its collections,
   rules and server functions together, and other parts go through its
   functions rather than reading its collections directly.
4. **Events between domains.** A completed task publishes an event that
   notifications and Slack react to, rather than calling them directly. The
   manager events dispatcher is a start.
5. **Read APIs outward.** External consumers, such as the website and the AI
   agent, get read-only projections with no request parameters that reveal
   anything.

## 8. Revisiting this

The position should be revisited if any of these change:

- a feature gets its own team, with its own release pace
- a part needs to scale or run very differently from the rest
- the authorization rules settle into something small and stable enough to be
  served as an API without becoming a bottleneck
