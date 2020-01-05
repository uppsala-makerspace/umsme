import SimpleSchema from 'simpl-schema';

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
    lock: {label: 'Lock', type: String, optional: true},
    youth: {label: 'Youth', type: Boolean, max: 10, autoform: { defaultValue: false }},
    family: {label: 'Family', type: Boolean, max: 10, optional: true, autoform: { readonly: true }},
    member: {label: 'Member', type: Date, optional: true, autoform: { readonly: true, omit: true }},
    lab: {label: 'Labmember', type: Date, optional: true, autoform: { readonly: true, omit: true }},
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
    amount: {label: 'Amount', type: Number, optional: true},
    start: {label: 'Start', type: Date},
    type: {label: 'Type', type: String, max: 20,
      autoform: {
        noselect: true,
        type: 'select-radio',
        options: {
          member: 'Membership',
          lab: 'Lab membershio (requires existing membership)',
          labandmember: 'Membership & Lab membership',
        }
    }},
    discount: {label: 'Discount', type: Boolean, optional: true},
    family: {label: 'Family', type: Boolean, optional: true},
    end:  {label: 'End', type: Date}
  },
  note: {
    _id: {label: 'Id', type: String, max: 10},
    referrsto: {label: 'Entity', type: String, max: 50},
    message: {label: 'Message', type: String, max: 500},
    created: {label: 'Created', type: Date}
  },
  message: {
    _id: {label: 'Id', type: String, max: 10},
    template: {label: 'Template', type: String, max: 10},
    member: {label: 'Member', type: String, max: 10},
    membership: {label: 'Member', type: String, max: 10},
    labaccess: {label: 'Member', type: String, max: 10},
    type: {label: 'Status', type: String, max: 10},
    senddate: {label: 'Sent at', type: Date}
  },
  template: {
    name: {label: 'Template name', type: String, max: 50},
    type: {label: 'Message type', type: String, max: 10,
      autoform: {
        noselect: true,
        type: 'select-radio-inline',
        options: {
          welcome: 'Welcome',
          confirmation: 'Confirmation',
          reminder: 'Reminder',
        }
      }},
    membershiptype: {label: 'Membership type', type: String, max: 15,
      autoform: {
        noselect: true,
        type: 'select-radio-inline',
        options: {
          member: 'Member',
          lab: 'Lab and member',
          labandmember: 'Lab',
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
    messagetext: {label: 'Text', type: String, max: 2000,
    autoform: {
      type: 'textarea',
    }},
    deprecated: {label: 'Deprecated', type: Boolean, optional: true},
    created: {label: 'Created', type: Date, autoform: { readonly: true, type: 'datetime-local' }},
    modified: {label: 'Modifed', type: Date, autoform: { readonly: true, type: 'datetime-local' }}
  },
  payment: {
    _id: {label: 'Id', type: String, max: 10},
    transactionid: {label: 'Transaction id', type: String, max: 10},
    message: {label: 'Message', type: String, max: 200},
    amount: {label: 'Amount', type: Number},
    date: {label: 'Date', type: Date},
    processed: {label: 'Done', type: Boolean},
    clarification: {label: 'Clarification', type: String, max: 200},
    member: {label: 'Member', type: String, max: 20}
  }
};
