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

export const models = {
  initiatedPayments: {
    externalId: {
      type: String,
    },
    member: { label: "Member", type: String, max: 20, optional: true },
    status: { label: "status", type: String },
    amount: { label: "amount", type: String },
    createdAt: { label: "createdAt", type: Date },
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
    email: {
      label: "Email",
      type: String,
      max: 200,
      autoform: {
        type: "email",
      },
      optional: true,
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
    },
    sms: {
      label: "SMS (140 characters)",
      type: String,
      max: 140,
      optional: true,
      autoform: {
        type: "textarea",
      },
    },
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
      },
    },
    sms: {
      label: "SMS (140 characters)",
      type: String,
      max: 140,
      optional: true,
      autoform: {
        type: "textarea",
      },
    },
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
        },
      },
    },
    membershiptype: {
      label: "Membership type",
      type: String,
      max: 15,
      autoform: {
        noselect: true,
        type: "select-radio-inline",
        options: {
          member: "Member",
          lab: "Lab",
          labandmember: "Lab and member",
        },
      },
    },
    membertype: {
      label: "Member type",
      type: String,
      max: 15,
      autoform: {
        noselect: true,
        type: "select-radio-inline",
        options: {
          normal: "Member",
          family: "Family",
          youth: "Youth",
        },
      },
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
    sms: {
      label: "SMS (140 characters)",
      type: String,
      max: 140,
      optional: true,
      autoform: {
        type: "textarea",
      },
    },
    deprecated: { label: "Deprecated", type: Boolean },
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
    date: { label: "Date", type: Date },
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
    externalId: { label: "External ID", type: String, max: 40, optional: true },
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
    mandatory: {
      label: "Mandatory for membership",
      type: Boolean,
      optional: true,
      autoform: {
        omit: true,
      },
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
};
