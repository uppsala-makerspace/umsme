import SimpleSchema from 'simpl-schema';

let fromOptions;
let getFromOptions = (callback) => {
  if (!fromOptions) {
    return Meteor.call('fromOptions', (err, res) => {
      fromOptions = res;
      callback && callback();
    });
  } else {
    callback && callback();
  }
  return fromOptions || [];
};

export const models = {
  member: {
    mid: {label: 'Id', type: String, max: 10,
      autoform: {
        readonly: true,
        placeholder: 'Will be generated automatically'
      },
    },
    name: {label: 'Name', type: String, max: 200},
    email: {label: 'Email', type: String, max: 200,
      regEx: SimpleSchema.RegEx.Email,
      autoform: {
        type: 'email'
      },
      optional: true
    },
    family: {label: 'Family', type: Boolean, max: 10, optional: true, autoform: { readonly: true }},
    lock: {label: 'Lock', type: String, optional: true},
    youth: {label: 'Youth', type: Boolean, max: 10, autoform: { defaultValue: false }},
    liability: {label: 'Liability', type: Boolean, optional: true, autoform: { defaultValue: false }},
    member: {label: 'Member date', type: Date, optional: true, autoform: { readonly: true, omit: true }},
    lab: {label: 'Lab date', type: Date, optional: true, autoform: { readonly: true, omit: true }},
    reminder: {label: 'Reminder', type: Date, optional: true, autoform: { readonly: true, omit: true }},
    infamily: {label: 'Paying family member', type: String, max: 50,
      autoform: {
        omit: true
      },
      optional: true
    }
  },
  membership: {
    mid: {label: 'Member id', type: String, max: 50,
      autoform: {
        omit: true,
        readonly: true,
        placeholder: 'Must be provided as parameter'
      },
    },
    pid: {label: 'Payment id', type: String, max: 50,
      optional: true,
      autoform: {
        omit: true,
        placeholder: 'Must be provided as parameter'
      },
    },
    amount: {label: 'Amount', type: Number, optional: true},
    start: {label: 'Start', type: Date },
    type: {label: 'Type', type: String, max: 20,
      autoform: {
        noselect: true,
        type: 'select-radio',
        options: {
          member: 'Membership',
          lab: 'Lab membership (requires existing membership)',
          labandmember: 'Membership & Lab membership',
        }
    }},
    discount: {label: 'Discount', type: Boolean, optional: true},
    family: {label: 'Family', type: Boolean, optional: true},
    memberend:  {label: 'Membership end', type: Date , optional: true},
    labend:  {label: 'Lab membership end', type: Date, optional: true}
  },
  note: {
    _id: {label: 'Id', type: String, max: 10},
    referrsto: {label: 'Entity', type: String, max: 50},
    message: {label: 'Message', type: String, max: 500},
    created: {label: 'Created', type: Date}
  },
  message: {
    template: {label: 'Template', type: String, max: 20, autoform: { omit: true }},
    member: {label: 'Member', type: String, max: 20, autoform: { omit: true }},
    membership: {label: 'Membership', type: String, max: 20, optional: true, autoform: { omit: true }},
    type: {label: 'Message type', type: String, max: 20,
      autoform: {
        readonly: true,
        type: 'select-radio-inline',
        options: {
          welcome: 'Welcome',
          confirmation: 'Confirmation',
          reminder: 'Reminder',
          status: 'Status'
        }
      }},
    to: {label: 'To', type: String, max: 200},
    subject: {label: 'Subject', type: String, max: 200},
    senddate: {label: 'Sent', type: Date, autoform: { readonly: true, type: 'datetime-local' }},
    messagetext: {label: 'Text', type: String, max: 10000,
      autoform: {
        type: 'textarea',
      }},
  },
  getFromOptions,
  mail: {
    from: {label: 'From', type: String, max: 50,
      autoform: {
        type: 'select-radio-inline',
        options: getFromOptions,
      }
    },
    recipients: {label: 'Recipient type', type: String, max: 20,
      autoform: {
        type: 'select-radio-inline',
        options: {
          members: 'Current members',
          labmembers: 'Current labmembers',
          yearmembers: 'Members current year',
          recentmembers: 'Members last year',
        }
      }
    },
    family: {label: 'Include family members', type: Boolean},
    to: {label: 'To', type: Array, autoform: { type: 'recipients' } },
    'to.$': {label: 'Mail', type: String, max: 200},
    subject: {label: 'Subject', type: String, max: 200},
    senddate: {label: 'Sent', type: Date, autoform: { readonly: true, type: 'datetime-local' }},
    template: {label: 'Text', type: String, max: 10000,
      autoform: {
        type: 'textarea',
      }},
  },
  template: {
    name: {label: 'Template name', type: String, max: 50},
    type: {label: 'Message type', type: String, max: 15,
      autoform: {
        noselect: true,
        type: 'select-radio-inline',
        options: {
          welcome: 'Welcome',
          confirmation: 'Confirmation',
          reminder: 'Reminder',
          status: 'Status'
        }
      }},
    membershiptype: {label: 'Membership type', type: String, max: 15,
      autoform: {
        noselect: true,
        type: 'select-radio-inline',
        options: {
          member: 'Member',
          lab: 'Lab',
          labandmember: 'Lab and member',
        }
      }},
    membertype: {label: 'Member type', type: String, max: 15,
      autoform: {
        noselect: true,
        type: 'select-radio-inline',
        options: {
          normal: 'Member',
          family: 'Family',
          youth: 'Youth',
        }
      }},
    subject: {label: 'Subject', type: String, max: 100},
    messagetext: {label: 'Text', type: String, max: 10000,
    autoform: {
      type: 'textarea',
    }},
    deprecated: {label: 'Deprecated', type: Boolean},
    created: {label: 'Created', type: Date, autoform: { readonly: true, type: 'datetime-local' }},
    modified: {label: 'Modifed', type: Date, autoform: { readonly: true, type: 'datetime-local' }}
  },
  payment: {
    hash: {label: 'Hash', type: String, max: 40, autoform: { omit: true }},
    type: {label: "Type", type: String, max: 20,
      autoform: {
        noselect: true,
        type: 'select-radio-inline',
        options: {
          bankgiro: 'Bankgiro',
          swish: 'Swish',
        },
        readonly: true,
      }},
    amount: {label: 'Amount', type: Number},
    date: {label: 'Date', type: Date},
    message: {label: 'Message', type: String, max: 200, optional: true},
    other: {label: 'Other purpose', type: Boolean, optional: true},
    clarification: {label: 'Clarification', type: String, max: 200, optional: true},
    member: {label: 'Member', type: String, max: 20, optional: true},
    membership: {label: 'Membership', type: String, max: 20, optional: true}
  },
  lockusers: {
    name: {label: 'Member', type: String, max: 40},
    member: {label: 'Memberid', type: String, max: 40, autoform: { omit: true }},
    email: {label: 'Email', type: String, max: 40, autoform: { readonly: true }, optional: true},
    lockid: {label: 'User id', type: String, max: 40, autoform: { omit: true }, optional: true},
    lockusername: {label: 'Username', type: String, max: 40, autoform: { readonly: true }, optional: true },
    labdate: {label: 'Lab end date', type: Date, autoform: { readonly: true }},
    lockaccess: {label: 'Lock end date', type: Date, autoform: { readonly: true }, optional: true},
    infamily: {label: 'In family', type: Boolean, autoform: { omit: true }},
    lockstatus: {label: "Status", type: String, max: 40, optional: true,
      autoform: {
        noselect: true,
        type: 'select-radio-inline',
        options: {
          noaccount: 'No account',
          invited: 'Invited',
          wrong: 'Wrong',
          correct: 'Correct',
          forever: 'No end date',
          admin: 'Admin',
          old: 'Old account'
        },
        readonly: true,
      }},
  },
  comment: {
    text: {label: 'Text', type: String, max: 2000, optional: true},
    created: {label: 'Date', type: Date},
    modified: {label: 'Date', type: Date, optional: true},
    about: {label: 'Kommentar på', type: String, max: 20},
  },
};
