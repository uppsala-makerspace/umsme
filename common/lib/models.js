let fromOptions;
export const getFromOptions = (callback) => {
  if (!fromOptions) {
    return Meteor.call("fromOptions", (err, res) => {
      fromOptions = res;
      callback && callback();
    });
  } else {
    callback && callback();
  }
  return fromOptions || [];
};

export const getRoleOptions = () => {
  if (typeof Meteor !== 'undefined' && Meteor.roles) {
    return Meteor.roles.find().map(role => ({
      label: role._id,
      value: role._id
    }));
  }
  return [];
};

// Roles a group may sync its membership to. The admin role is excluded: it is
// bootstrap-managed (see admin/server/adminAvailable.js) and must never be
// granted through group membership.
export const getLinkableRoleOptions = () =>
  getRoleOptions().filter((o) => o.value !== "admin");

export const models = {
  initiatedPayments: {
    externalId: {
      type: String,
    },
    member: { label: "Member", type: String, max: 20, optional: true },
    status: { label: "status", type: String },
    amount: { label: "amount", type: String },
    createdAt: { label: "createdAt", type: Date, autoform: { type: "datetime-local" } },
    resolvedAt: { label: "resolvedAt", type: Date, optional: true, autoform: { type: "datetime-local" } },
    paymentType: { label: "Payment type", type: String },
    errorCode: { label: "Error code", type: String, max: 20, optional: true },
    errorMessage: { label: "Error message", type: String, max: 200, optional: true },
  },
  member: {
    mid: {
      label: "Id",
      type: String,
      max: 10,
      autoform: {
        readonly: true,
        placeholder: "Will be generated automatically",
      },
    },
    name: { label: "Name", type: String, max: 200 },
    birthyear: {
      label: "Year of birth", type: Number, optional: true
    },
    gender: { label: "Gender", type: String, optional: true, allowedValues: ["male", "female", "undisclosed"] },
    rfid: { label: "RFID", type: String, max: 20, optional: true, regEx: /^([0-9A-Fa-f]{2})+$/ },
    bankName: { label: "Bank", type: String, max: 100, optional: true },
    bankClearing: { label: "Clearing number", type: String, max: 6, optional: true },
    bankAccountNumber: { label: "Account number", type: String, max: 20, optional: true },
    bankAccountHolder: { label: "Account holder", type: String, max: 200, optional: true },
    email: {
      label: "Email",
      type: String,
      max: 200,
      autoform: {
        type: "email",
      },
      optional: true,
      autoValue: function () {
        if (this.isSet && typeof this.value === "string") {
          const lower = this.value.toLowerCase();
          if (lower !== this.value) return lower;
        }
      },
    },
    family: {
      label: "Family",
      type: Boolean,
      max: 10,
      optional: true,
      autoform: { readonly: true },
    },
    lock: { label: "Lock", type: String, optional: true },
    youth: {
      label: "Youth",
      type: Boolean,
      optional: true,
      max: 10,
      autoform: { defaultValue: false },
    },
    liability: {
      label: "Liability",
      type: Boolean,
      optional: true,
      autoform: { defaultValue: false },
    },
    liabilityDate: {
      label: "Liability version approved",
      type: Date,
      optional: true,
      autoform: { readonly: false },
    },
    member: {
      label: "Member date",
      type: Date,
      optional: true,
      autoform: { readonly: true, omit: true },
    },
    lab: {
      label: "Lab date",
      type: Date,
      optional: true,
      autoform: { readonly: true, omit: true },
    },
    reminder: {
      label: "Reminder",
      type: Date,
      optional: true,
      autoform: { readonly: true, omit: true },
    },
    infamily: {
      label: "Paying family member",
      type: String,
      max: 50,
      autoform: {
        omit: true,
      },
      optional: true,
    },
    storage: { label: "Storage box number", type: Number, optional: true },
    storagequeue: {
      label: "In queue for storage",
      type: Boolean,
      max: 10,
      optional: true,
    },
    storagerequest: {
      label: "Storage request",
      type: String,
      max: 30,
      optional: true,
      autoform: {
        type: "select",
        options: {
          floor1: "Floor 1 - anywhere",
          floor2: "Floor 2 - anywhere",
          floor1L: "Floor 1 - bottom shelf",
          floor2L: "Floor 2 - bottom shelf",
          floor1U: "Floor 1 - upper shelf",
          floor2U: "Floor 2 - upper shelf",
          none: "No box needed",
        },
      },
    },
    mobile: { label: "Mobile", type: String, max: 20, optional: true },
    paymentError: {
      label: "Payment Error",
      type: String,
      max: 50,
      optional: true,
      autoform: { readonly: true },
    },
    registered: {
      label: "Registered",
      type: Boolean,
      optional: true,
      autoform: { readonly: true },
    },
    excluded: {
      label: "Excluded",
      type: Boolean,
      optional: true,
      autoform: { omit: true },
    },
    notificationPrefs: {
      type: Object,
      optional: true,
      blackbox: true,
      autoform: { omit: true },
    },
    lastExpiryNotification: {
      type: Object,
      optional: true,
      blackbox: true,
      autoform: { omit: true },
    },
  },
  membership: {
    mid: {
      label: "Member id",
      type: String,
      max: 50,
      autoform: {
        omit: true,
        readonly: true,
        placeholder: "Must be provided as parameter",
      },
    },
    pid: {
      label: "Payment id",
      type: String,
      max: 50,
      optional: true,
      autoform: {
        omit: true,
        placeholder: "Must be provided as parameter",
      },
    },
    amount: { label: "Amount", type: Number, optional: true },
    start: { label: "Start", type: Date },
    type: {
      label: "Type",
      type: String,
      max: 30,
      autoform: {
        noselect: true,
        type: "select-radio",
        options: {
          member: "Membership",
          lab: "Lab membership (requires existing membership)",
          labandmember: "Membership & Lab membership",
        },
      },
    },
    discount: { label: "Discount", type: Boolean, optional: true },
    family: { label: "Family", type: Boolean, optional: true },
    memberend: { label: "Membership end", type: Date, optional: true },
    labend: { label: "Lab membership end", type: Date, optional: true },
  },
  note: {
    _id: { label: "Id", type: String, max: 10 },
    referrsto: { label: "Entity", type: String, max: 50 },
    message: { label: "Message", type: String, max: 500 },
    created: { label: "Created", type: Date },
  },
  message: {
    template: {
      label: "Template",
      type: String,
      max: 20,
      autoform: { omit: true },
    },
    member: {
      label: "Member",
      type: String,
      max: 20,
      autoform: { omit: true },
    },
    membership: {
      label: "Membership",
      type: String,
      max: 20,
      optional: true,
      autoform: { omit: true },
    },
    type: {
      label: "Message type",
      type: String,
      max: 20,
      autoform: {
        readonly: true,
        type: "select-radio-inline",
        options: {
          welcome: "Welcome",
          confirmation: "Confirmation",
          reminder: "Reminder",
          status: "Status",
          invite: "Invite",
        },
      },
    },
    to: { label: "To", type: String, max: 200 },
    subject: { label: "Subject", type: String, max: 200 },
    senddate: {
      label: "Sent",
      type: Date,
      autoform: { readonly: true, type: "datetime-local" },
    },
    messagetext: {
      label: "Text",
      type: String,
      max: 10000,
      autoform: {
        type: "textarea",
      },
    }
  },
  mail: {
    from: {
      label: "From",
      type: String,
      max: 50,
      autoform: {
        type: "select-radio-inline",
        options: getFromOptions,
      },
    },
    recipients: {
      label: "Recipient type",
      type: String,
      max: 20,
      autoform: {
        type: "select-radio-inline",
        options: {
          members: "Current members",
          labmembers: "Current labmembers",
          yearmembers: "Members current year",
          recentmembers: "Members last year",
        },
      },
    },
    family: { label: "Include family members", type: Boolean },
    to: { label: "To", type: Array, autoform: { type: "recipients" } },
    "to.$": { label: "Mail", type: String, max: 200 },
    failed: {
      label: "Failed",
      type: Array,
      optional: true,
      autoform: { type: "recipients" },
    },
    "failed.$": { label: "Mail", type: String, max: 200 },
    subject: { label: "Subject", type: String, max: 200 },
    senddate: {
      label: "Sent",
      type: Date,
      autoform: { readonly: true, type: "datetime-local" },
    },
    template: {
      label: "Text",
      type: String,
      max: 10000,
      autoform: {
        type: "textarea",
        rows: 25,
      },
    },
    formatted: { label: "Formatted", type: Boolean, optional: true },
  },
  template: {
    name: { label: "Template name", type: String, max: 50 },
    type: {
      label: "Message type",
      type: String,
      max: 15,
      autoform: {
        noselect: true,
        type: "select-radio-inline",
        options: {
          welcome: "Welcome",
          confirmation: "Confirmation",
          reminder: "Reminder",
          status: "Status",
          invite: "Invite",
        },
      },
    },
    membershiptype: {
      label: "Membership type",
      type: String,
      max: 15,
      autoform: {
        type: "select-radio-inline",
        options: {
          "": "Any",
          member: "Member",
          lab: "Lab",
          labandmember: "Lab and member",
        },
      },
      optional: true
    },
    membertype: {
      label: "Member type",
      type: String,
      max: 15,
      autoform: {
        type: "select-radio-inline",
        options: {
          "": "Any",
          normal: "Member",
          family: "Family",
          youth: "Youth",
        },
      },
      optional: true
    },
    subject: { label: "Subject", type: String, max: 100 },
    messagetext: {
      label: "Text",
      type: String,
      max: 10000,
      autoform: {
        type: "textarea",
      },
    },
    deprecated: { label: "Deprecated", type: Boolean },
    auto: { label: "Automatic", type: Boolean, optional: true },
    created: {
      label: "Created",
      type: Date,
      autoform: { readonly: true, type: "datetime-local" },
    },
    modified: {
      label: "Modifed",
      type: Date,
      autoform: { readonly: true, type: "datetime-local" },
    },
  },
  payment: {
    hash: { label: "Hash", type: String, max: 40, autoform: { omit: true } },
    type: {
      label: "Type",
      type: String,
      max: 20,
      autoform: {
        noselect: true,
        type: "select-radio-inline",
        options: {
          bankgiro: "Bankgiro",
          swish: "Swish",
        },
        readonly: true,
      },
    },
    amount: { label: "Amount", type: Number },
    date: { label: "Date", type: Date, autoform: { type: "datetime-local" } },
    message: { label: "Message", type: String, max: 200, optional: true },
    name: { label: "Name", type: String, max: 200, optional: true },
    mobile: { label: "Mobile", type: String, max: 20, optional: true },
    other: { label: "Other purpose", type: Boolean, optional: true },
    clarification: {
      label: "Clarification",
      type: String,
      max: 200,
      optional: true,
    },
    member: { label: "Member", type: String, max: 20, optional: true },
    membership: { label: "Membership", type: String, max: 20, optional: true },
    externalId: { label: "External ID", type: String, max: 40, optional: true, autoform: { readonly: true } },
    initiatedBy: { label: "Initiated by", type: String, max: 20, optional: true, autoform: { readonly: true } },
  },
  lockusers: {
    name: { label: "Member", type: String, max: 40 },
    member: {
      label: "Memberid",
      type: String,
      max: 40,
      autoform: { omit: true },
    },
    email: {
      label: "Email",
      type: String,
      max: 80,
      autoform: { readonly: true },
      optional: true,
    },
    lockid: {
      label: "User id",
      type: String,
      max: 40,
      autoform: { omit: true },
      optional: true,
    },
    lockusername: {
      label: "Username",
      type: String,
      max: 80,
      autoform: { readonly: true },
      optional: true,
    },
    labdate: {
      label: "Lab end date",
      type: Date,
      autoform: { readonly: true },
    },
    lockaccess: {
      label: "Lock end date",
      type: Date,
      autoform: { readonly: true },
      optional: true,
    },
    infamily: { label: "In family", type: Boolean, autoform: { omit: true } },
    lockstatus: {
      label: "Status",
      type: String,
      max: 40,
      optional: true,
      autoform: {
        noselect: true,
        type: "select-radio-inline",
        options: {
          noaccount: "No account",
          invited: "Invited",
          wrong: "Wrong",
          correct: "Correct",
          forever: "No end date",
          admin: "Admin",
          old: "Old account",
        }
      },
    },
  },
  unlocks: {
    timestamp: { label: "Timestamp", type: Date },
    username: { label: "Username", type: String, max: 50 },
    user: { label: "User", type: String, max: 25 },
  },
  doorunlocks: {
    timestamp: { label: "Timestamp", type: Date },
    door: { label: "Door", type: String, max: 50 },
    memberid: { label: "Member ID", type: String, max: 25, optional: true },
    extid: { label: "External ID", type: String, max: 100, optional: true },
    method: { label: "Method", type: String, allowedValues: ['app', 'danalock'] },
  },
  comment: {
    text: { label: "Text", type: String, max: 2000, optional: true },
    created: { label: "Date", type: Date },
    modified: { label: "Date", type: Date, optional: true },
    about: { label: "Kommentar på", type: String, max: 20 },
  },
  users: {
    username: { label: "Username", type: String, max: 50, optional: true },
    emails: { label: "Email", type: Array },
    "emails.$": { label: "Mail", type: Object, optional: true },
    "emails.$.address": {
      label: "Mail",
      type: String,
      max: 80,
      optional: true,
    },
    "emails.$.verified": { label: "Verified", type: Boolean, optional: true },
  },
  invites: {
    email: {
      label: "Email",
      type: String,
      max: 200,
      autoform: {
        type: "email",
      }
    },
    infamily: {
      label: "Invited to family",
      type: String,
      max: 50,
      autoform: {
        omit: true,
      }
    },
  },
  liabilityDocument: {
    title: { label: "Title", type: String, max: 200 },
    date: { label: "Date", type: Date },
    text: {
      label: "Document text",
      type: Object,
      blackbox: true,
    },
    "text.sv": {
      label: "Document text (Swedish)",
      type: String,
      max: 50000,
      optional: true,
      autoform: {
        type: "textarea",
      },
    },
    "text.en": {
      label: "Document text (English)",
      type: String,
      max: 50000,
      optional: true,
      autoform: {
        type: "textarea",
      },
    },
  },
  certificate: {
    name: {
      label: "Name",
      type: Object,
      blackbox: true,
    },
    "name.sv": {
      label: "Name (Swedish)",
      type: String,
      max: 200,
    },
    "name.en": {
      label: "Name (English)",
      type: String,
      max: 200,
      optional: true,
    },
    description: {
      label: "Description",
      type: Object,
      blackbox: true,
      optional: true,
    },
    "description.sv": {
      label: "Description (Swedish)",
      type: String,
      max: 1000,
      optional: true,
      autoform: {
        type: "textarea",
        rows: 10,
      },
    },
    "description.en": {
      label: "Description (English)",
      type: String,
      max: 1000,
      optional: true,
      autoform: {
        type: "textarea",
        rows: 10,
      },
    },
    defaultValidityDays: {
      label: "Default validity (days)",
      type: Number,
      optional: true,
    },
    prerequisites: {
      label: "Prerequisites",
      type: Array,
      optional: true,
      autoform: { omit: true },
    },
    "prerequisites.$": { type: String, autoform: { omit: true } },
    certifiers: {
      label: "Certifiers",
      type: Array,
      optional: true,
      autoform: { omit: true },
    },
    "certifiers.$": { type: String, autoform: { omit: true } },
    certifierRole: {
      label: "Certifier role",
      type: String,
      max: 100,
      optional: true,
      autoform: {
        type: "select",
        firstOption: "(Select a role)",
        options: getRoleOptions,
      },
    },
    // Workshop (verkstad) this certificate belongs to, e.g. the laser
    // certificate under the wood workshop. Picked in admin, so omitted here.
    workshopId: {
      label: "Workshop",
      type: String,
      max: 50,
      optional: true,
      autoform: { omit: true },
    },
    mandatory: {
      label: "Mandatory for membership",
      type: Boolean,
      optional: true,
      autoform: {
        omit: true,
      },
    },
    test: {
      label: "Test settings",
      type: Object,
      optional: true,
      autoform: { omit: true },
    },
    "test.testId": {
      label: "Test id",
      type: String,
      max: 100,
    },
    "test.maxAttempts": {
      label: "Max attempts",
      type: Number,
      min: 1,
    },
    "test.maxErrors": {
      label: "Max errors allowed",
      type: Number,
      min: 0,
    },
  },
  attestation: {
    certificateId: {
      label: "Certificate",
      type: String,
      max: 50,
    },
    memberId: {
      label: "Member",
      type: String,
      max: 50,
    },
    certifierId: {
      label: "Certified by",
      type: String,
      max: 50,
      optional: true,
    },
    startDate: {
      label: "Start date",
      type: Date,
    },
    endDate: {
      label: "End date",
      type: Date,
      optional: true,
    },
    comment: {
      label: "Comment",
      type: String,
      max: 1000,
      optional: true,
      autoform: {
        type: "textarea",
      },
    },
    privateComment: {
      label: "Private comment",
      type: String,
      max: 1000,
      optional: true,
      autoform: {
        type: "textarea",
      },
    },
    attempt: {
      label: "Attempt",
      type: Number,
      optional: true,
      autoform: { omit: true },
    },
    confirmedAt: {
      label: "Confirmed at",
      type: Date,
      optional: true,
      autoform: { omit: true },
    },
  },
  announcement: {
    type: {
      label: "Type",
      type: String,
      max: 20,
      autoform: {
        type: "select",
        options: {
          newsletter: "Newsletter",
          information: "Information",
        },
      },
    },
    subjectSv: { label: "Ämne (Svenska)", type: String, max: 200 },
    subjectEn: { label: "Subject (English)", type: String, max: 200, optional: true },
    bodySv: {
      label: "Innehåll (Svenska)",
      type: String,
      max: 50000,
      autoform: { type: "textarea", rows: 25 },
    },
    bodyEn: {
      label: "Content (English)",
      type: String,
      max: 50000,
      optional: true,
      autoform: { type: "textarea", rows: 25 },
    },
    status: {
      label: "Status",
      type: String,
      max: 10,
      autoform: { readonly: true },
    },
    createdAt: {
      label: "Created",
      type: Date,
      autoform: { readonly: true, type: "datetime-local" },
    },
    sentAt: {
      label: "Sent",
      type: Date,
      optional: true,
      autoform: { readonly: true, type: "datetime-local" },
    },
    mailId: {
      label: "Mail",
      type: String,
      max: 20,
      optional: true,
      autoform: { readonly: true },
    },
  },
  testAttempt: {
    memberId: { type: String, max: 50 },
    certificateId: { type: String, max: 50 },
    testId: { type: String, max: 100 },
    attemptNumber: { type: Number, min: 1 },
    state: { type: String, allowedValues: ["active", "passed", "failed"] },
    startedAt: { type: Date },
    completedAt: { type: Date, optional: true },
    usedQuestionIds: { type: Object, blackbox: true },
    session: { type: Object, blackbox: true, optional: true },
    result: { type: Object, blackbox: true, optional: true },
  },
  expenseAccount: {
    name: { label: "Name", type: String, max: 200 },
    explanation: {
      label: "Explanation",
      type: String,
      max: 2000,
      autoform: { type: "textarea", rows: 5 },
    },
    // Dimension → object-code map for SIE tagging (Phase 2), e.g. { "1": "MEDLEM" }.
    // Keys are the dimension numbers configured in settings.accounting.dimensions;
    // the admin UI builds and validates this, so it's blackbox + omitted from AutoForm.
    dimensions: {
      label: "Dimensions",
      type: Object,
      optional: true,
      blackbox: true,
      autoform: { omit: true },
    },
    // Groups (grupper) this account belongs to. Members of any of these groups
    // may make expenses on the account, and approvers are picked from their
    // members. Optional in the schema, but the guideline requires at least one.
    groupIds: {
      label: "Groups",
      type: Array,
      optional: true,
      autoform: { omit: true },
    },
    "groupIds.$": { type: String, autoform: { omit: true } },
    // Members allowed to approve expenses on this account (guideline: at least
    // two). Stored now; the approval flow itself is still role-based.
    approverMemberIds: {
      label: "Expense approvers",
      type: Array,
      optional: true,
      autoform: { omit: true },
    },
    "approverMemberIds.$": { type: String, autoform: { omit: true } },
    createdAt: {
      label: "Created",
      type: Date,
      optional: true,
      autoform: { omit: true },
    },
  },
  expense: {
    memberId: { label: "Member", type: String, max: 50 },
    driveFileId: { label: "Receipt file id", type: String, max: 200 },
    mimeType: { label: "Receipt mime type", type: String, max: 100 },
    status: {
      label: "Status",
      type: String,
      max: 20,
      defaultValue: "pending",
      allowedValues: ["pending", "submitted", "confirmed", "rejected", "reimbursed"],
    },
    date: { label: "Receipt date", type: Date },
    createdAt: {
      label: "Created",
      type: Date,
      autoform: { omit: true },
    },
    amount: { label: "Amount", type: Number, optional: true },
    expenseAccountId: {
      label: "Expense account",
      type: String,
      max: 50,
      optional: true,
    },
    place: {
      label: "Place of purchase",
      type: String,
      max: 200,
      optional: true,
    },
    note: {
      label: "Note",
      type: String,
      max: 2000,
      optional: true,
      autoform: { type: "textarea" },
    },
    rejectionReason: {
      label: "Rejection reason",
      type: String,
      max: 2000,
      optional: true,
      autoform: { type: "textarea" },
    },
    submittedAt: { label: "Submitted at", type: Date, optional: true, autoform: { omit: true } },
    confirmedAt: { label: "Confirmed at", type: Date, optional: true, autoform: { omit: true } },
    confirmedBy: { label: "Confirmed by", type: String, max: 50, optional: true, autoform: { omit: true } },
    rejectedAt: { label: "Rejected at", type: Date, optional: true, autoform: { omit: true } },
    rejectedBy: { label: "Rejected by", type: String, max: 50, optional: true, autoform: { omit: true } },
    reimbursedAt: { label: "Reimbursed at", type: Date, optional: true, autoform: { omit: true } },
    reimbursedBy: { label: "Reimbursed by", type: String, max: 50, optional: true, autoform: { omit: true } },
    // Chosen BAS ledger account for this expense, set by the treasurer at
    // reimbursement (from settings.accounting.expense.accountOptions). Distinct
    // from expenseAccountId, which references the ExpenseAccount category.
    bookkeepingAccount: { label: "Bookkeeping account", type: String, max: 50, optional: true, autoform: { omit: true } },
    // Actual reimbursement payment date (the Phase 2 verification date), set by
    // the treasurer at reimbursement. Distinct from the reimbursedAt audit timestamp.
    reimbursedDate: { label: "Reimbursed date", type: Date, optional: true, autoform: { omit: true } },
  },
  // A group (grupp) per the workshops-and-groups guideline: an organised set
  // of members with a shared responsibility or interest. Steering groups own
  // a workshop; responsibility groups are subgroups of a steering group.
  group: {
    name: {
      label: "Name",
      type: Object,
      blackbox: true,
    },
    "name.sv": {
      label: "Name (Swedish)",
      type: String,
      max: 100,
    },
    "name.en": {
      label: "Name (English)",
      type: String,
      max: 100,
      optional: true,
    },
    // Short label for the public website's listing (see the /api/public
    // export). Not the same as the name: "Textilverkstad" vs "Textil".
    tag: {
      label: "Tag (public website)",
      type: Object,
      blackbox: true,
      optional: true,
    },
    "tag.sv": {
      label: "Tag (Swedish)",
      type: String,
      max: 40,
      optional: true,
    },
    "tag.en": {
      label: "Tag (English)",
      type: String,
      max: 40,
      optional: true,
    },
    description: {
      label: "Description",
      type: Object,
      blackbox: true,
      optional: true,
    },
    "description.sv": {
      label: "Description (Swedish, markdown)",
      type: String,
      max: 5000,
      optional: true,
      autoform: { type: "textarea", rows: 10 },
    },
    "description.en": {
      label: "Description (English, markdown)",
      type: String,
      max: 5000,
      optional: true,
      autoform: { type: "textarea", rows: 10 },
    },
    // Rules text (bilingual markdown), shown on its own page linked from a
    // card when present.
    rules: {
      label: "Rules",
      type: Object,
      blackbox: true,
      optional: true,
    },
    "rules.sv": {
      label: "Rules (Swedish, markdown)",
      type: String,
      max: 10000,
      optional: true,
      autoform: { type: "textarea", rows: 10 },
    },
    "rules.en": {
      label: "Rules (English, markdown)",
      type: String,
      max: 10000,
      optional: true,
      autoform: { type: "textarea", rows: 10 },
    },
    type: {
      label: "Type",
      type: String,
      allowedValues: ["steering", "function", "interest", "responsibility"],
      autoform: {
        type: "select",
        firstOption: "(Select a type)",
        options: [
          { label: "Steering group (styrgrupp)", value: "steering" },
          { label: "Function group (funktionsgrupp)", value: "function" },
          { label: "Interest group (intressegrupp)", value: "interest" },
          { label: "Responsibility group (ansvarsgrupp)", value: "responsibility" },
        ],
      },
    },
    slackChannel: {
      label: "Slack channel",
      type: String,
      max: 80,
      optional: true,
    },
    // Link to guides/tutorials. Shown as a card on interest and function group
    // pages, like workshops. (Workshop and responsibility groups get guides via
    // their connected workshop instead.)
    guidesUrl: {
      label: "Guides URL",
      type: String,
      max: 500,
      optional: true,
    },
    // The one person responsible for the group (gruppansvarig). Picked with a
    // member selector in admin, so omitted from AutoForm.
    responsibleMemberId: {
      label: "Group responsible",
      type: String,
      max: 50,
      optional: true,
      autoform: { omit: true },
    },
    // Required for responsibility groups; must reference a steering group.
    // Enforced by deny rules on the collection (schema can't do async checks).
    parentGroupId: {
      label: "Parent group",
      type: String,
      max: 50,
      optional: true,
      autoform: { omit: true },
    },
    // Workshops this group is related to (e.g. an interest group that partly
    // operates in a workshop). Listed on those workshops' pages in the app.
    relatedWorkshopIds: {
      label: "Related workshops",
      type: Array,
      optional: true,
      autoform: { omit: true },
    },
    "relatedWorkshopIds.$": { type: String, autoform: { omit: true } },
    // Other groups this group is related to. The relation is mutual: each side
    // is shown on the other's page, so only one side needs to record it. Any
    // group type may relate to any other (edited in admin).
    relatedGroupIds: {
      label: "Related groups",
      type: Array,
      optional: true,
      autoform: { omit: true },
    },
    "relatedGroupIds.$": { type: String, autoform: { omit: true } },
    joinPolicy: {
      label: "Join policy",
      type: String,
      allowedValues: ["open", "request-any", "request-responsible"],
      defaultValue: "request-responsible",
      autoform: {
        type: "select",
        options: [
          { label: "Open — anyone can join", value: "open" },
          { label: "Request — any group member approves", value: "request-any" },
          { label: "Request — only group responsible approves", value: "request-responsible" },
        ],
      },
    },
    // Representative image, stored via common/server/workshopImageStore.js
    // (the same local store as workshop images).
    imageFileId: {
      label: "Image file id",
      type: String,
      max: 200,
      optional: true,
      autoform: { omit: true },
    },
    imageMimeType: {
      label: "Image mime type",
      type: String,
      max: 100,
      optional: true,
      autoform: { omit: true },
    },
    // Map spaces (ytor) this group is responsible for or active in: one
    // primary and any number of secondary. Picked in admin.
    primarySpaceId: {
      label: "Primary space",
      type: String,
      max: 50,
      optional: true,
      autoform: { omit: true },
    },
    secondarySpaceIds: {
      label: "Secondary spaces",
      type: Array,
      optional: true,
      autoform: { omit: true },
    },
    "secondarySpaceIds.$": { type: String, autoform: { omit: true } },
    // Meteor role kept in sync from this group's active membership (the group
    // is the source of truth; see common/server/linkedRoleSync.js). Never
    // 'admin', and not allowed together with an open join policy — enforced
    // by deny rules on the collection.
    linkedRole: {
      label: "Linked role",
      type: String,
      max: 100,
      optional: true,
      autoform: {
        type: "select",
        firstOption: "(No linked role)",
        options: getLinkableRoleOptions,
      },
    },
    createdAt: {
      label: "Created",
      type: Date,
      optional: true,
      autoform: { omit: true },
    },
  },
  // A workshop (verkstad): a space with tools and machines for a certain kind
  // of making. Always cared for by exactly one steering group.
  workshop: {
    name: {
      label: "Name",
      type: Object,
      blackbox: true,
    },
    "name.sv": {
      label: "Name (Swedish)",
      type: String,
      max: 100,
    },
    "name.en": {
      label: "Name (English)",
      type: String,
      max: 100,
      optional: true,
    },
    // Short label for the public website's listing (see the /api/public
    // export). Not the same as the name: "Textilverkstad" vs "Textil".
    tag: {
      label: "Tag (public website)",
      type: Object,
      blackbox: true,
      optional: true,
    },
    "tag.sv": {
      label: "Tag (Swedish)",
      type: String,
      max: 40,
      optional: true,
    },
    "tag.en": {
      label: "Tag (English)",
      type: String,
      max: 40,
      optional: true,
    },
    description: {
      label: "Description",
      type: Object,
      blackbox: true,
      optional: true,
    },
    "description.sv": {
      label: "Description (Swedish, markdown)",
      type: String,
      max: 5000,
      optional: true,
      autoform: { type: "textarea", rows: 10 },
    },
    "description.en": {
      label: "Description (English, markdown)",
      type: String,
      max: 5000,
      optional: true,
      autoform: { type: "textarea", rows: 10 },
    },
    // Rules text (bilingual markdown), shown on its own page linked from a
    // card when present.
    rules: {
      label: "Rules",
      type: Object,
      blackbox: true,
      optional: true,
    },
    "rules.sv": {
      label: "Rules (Swedish, markdown)",
      type: String,
      max: 10000,
      optional: true,
      autoform: { type: "textarea", rows: 10 },
    },
    "rules.en": {
      label: "Rules (English, markdown)",
      type: String,
      max: 10000,
      optional: true,
      autoform: { type: "textarea", rows: 10 },
    },
    status: {
      label: "Status",
      type: String,
      allowedValues: ["established", "trial", "forming", "decommissioned"],
      defaultValue: "forming",
      autoform: {
        type: "select",
        options: [
          { label: "Established (etablerad)", value: "established" },
          { label: "Trial (på prov)", value: "trial" },
          { label: "Forming (blivande)", value: "forming" },
          { label: "Decommissioned (avvecklad)", value: "decommissioned" },
        ],
      },
    },
    slackChannel: {
      label: "Slack channel",
      type: String,
      max: 80,
      optional: true,
    },
    // The responsible steering group (1:1). Optional in the schema so a
    // workshop can be drafted first; required for completeness (groupRules).
    groupId: {
      label: "Responsible group",
      type: String,
      max: 50,
      optional: true,
      autoform: { omit: true },
    },
    // Representative image, stored via common/server/workshopImageStore.js.
    imageFileId: {
      label: "Image file id",
      type: String,
      max: 200,
      optional: true,
      autoform: { omit: true },
    },
    imageMimeType: {
      label: "Image mime type",
      type: String,
      max: 100,
      optional: true,
      autoform: { omit: true },
    },
    guidesUrl: {
      label: "Guides URL",
      type: String,
      max: 500,
      optional: true,
    },
    // Map spaces (ytor) this workshop occupies: one primary and any number of
    // secondary. Picked in admin, so omitted from AutoForm.
    primarySpaceId: {
      label: "Primary space",
      type: String,
      max: 50,
      optional: true,
      autoform: { omit: true },
    },
    secondarySpaceIds: {
      label: "Secondary spaces",
      type: Array,
      optional: true,
      autoform: { omit: true },
    },
    "secondarySpaceIds.$": { type: String, autoform: { omit: true } },
    createdAt: {
      label: "Created",
      type: Date,
      optional: true,
      autoform: { omit: true },
    },
  },
  // A space (yta) in the premises, shown on the app's map. Imported from
  // rooms.json once and managed in admin thereafter. spaceId + floor tie the
  // space to the map: the floor SVGs contain elements named
  // `${spaceId}-marker` and `${spaceId}-floor`.
  space: {
    spaceId: {
      label: "Space id (map key)",
      type: String,
      max: 100,
    },
    floor: {
      label: "Floor",
      type: String,
      allowedValues: ["floor1", "floor2"],
      autoform: {
        type: "select",
        options: [
          { label: "Floor 1", value: "floor1" },
          { label: "Floor 2", value: "floor2" },
        ],
      },
    },
    name: {
      label: "Name",
      type: Object,
      blackbox: true,
    },
    "name.sv": {
      label: "Name (Swedish)",
      type: String,
      max: 100,
    },
    "name.en": {
      label: "Name (English)",
      type: String,
      max: 100,
      optional: true,
    },
    description: {
      label: "Description",
      type: Object,
      blackbox: true,
      optional: true,
    },
    "description.sv": {
      label: "Description (Swedish)",
      type: String,
      max: 2000,
      optional: true,
      autoform: { type: "textarea", rows: 5 },
    },
    "description.en": {
      label: "Description (English)",
      type: String,
      max: 2000,
      optional: true,
      autoform: { type: "textarea", rows: 5 },
    },
    // Channel names with or without '#', as in rooms.json. Edited via a
    // comma-separated field in admin, so omitted from AutoForm.
    slackChannels: {
      label: "Slack channels",
      type: Array,
      optional: true,
      autoform: { omit: true },
    },
    "slackChannels.$": { type: String, autoform: { omit: true } },
    // Uploaded map icon (SVG/PNG), stored via common/server/mapIconStore.js,
    // and its rendered size on the map.
    iconFileId: {
      label: "Icon file id",
      type: String,
      max: 200,
      optional: true,
      autoform: { omit: true },
    },
    iconMimeType: {
      label: "Icon mime type",
      type: String,
      max: 100,
      optional: true,
      autoform: { omit: true },
    },
    iconSize: {
      label: "Icon size",
      type: Number,
      optional: true,
    },
    createdAt: {
      label: "Created",
      type: Date,
      optional: true,
      autoform: { omit: true },
    },
  },
  // Member <-> group link with a join/approval workflow, mirroring how
  // attestations link members to certificates.
  groupMembership: {
    groupId: { label: "Group", type: String, max: 50 },
    memberId: { label: "Member", type: String, max: 50 },
    state: {
      label: "State",
      type: String,
      allowedValues: ["pending", "active"],
      defaultValue: "pending",
    },
    requestedAt: { label: "Requested at", type: Date },
    approvedAt: { label: "Approved at", type: Date, optional: true },
    // memberId of the approver, or '__system__' for open joins / admin edits.
    approvedBy: { label: "Approved by", type: String, max: 50, optional: true },
  },
};
