import SimpleSchema from 'simpl-schema';

export const models = {
  member: {
    mid: {label: 'Id', type: String, max: 10,
      autoform: {
        readonly: true,
        placeholder: 'Will be generated automatically'
      },
    },
    name: {label: 'Namn', type: String, max: 200},
    email: {label: 'Epost', type: String, max: 200,
      regEx: SimpleSchema.RegEx.Email,
      autoform: {
        type: 'email'
      },
      optional: false
    },
    familj: {label: 'Familj', type: Boolean, max: 10},
    member: {label: 'Medlemskap', type: Date},
    lab: {label: 'Labb', type: Date},
    lock: {label: 'Lås', type: String},
    infamily: {label: 'Betalande familjemedlem', type: String, max: 10,
      autoform: {
        omit: true
      },
      optional: true
    }
  },
  membership: {
    mid: {label: 'Member', type: String, max: 50,
      autoform: {
        readonly: true,
        placeholder: 'Must be provided as parameter'
      },
    },
    type: {label: 'Typ', type: String, max: 20,
      autoform: {
        noselect: true,
        type: 'select-radio',
        options: {
          member: 'Medlemskap',
          lab: 'Labbmedlemskap (kräver existerande medlemskap)',
          labandmember: 'Medlemskap & Labbmedlemskap',
        }
    }},
    family: {label: 'Familj', type: Boolean},
    start: {label: 'Start', type: Date},
    end:  {label: 'End', type: Date}
  },
  note: {
    _id: {label: 'Id', type: String, max: 10},
    referrsto: {label: 'Entitet', type: String, max: 10},
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
    _id: {label: 'Id', type: String, max: 10},
    subject: {label: 'Subject', type: String, max: 100},
    messagetext: {label: 'Text', type: String, max: 1000},
    type: {label: 'Status', type: String, max: 10},
    created: {label: 'Created', type: Date},
    modified: {label: 'Modifed', type: Date}
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
