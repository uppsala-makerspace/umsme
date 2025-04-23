import { Meteor } from "meteor/meteor";
import { Members } from "/collections/members";
import { Memberships } from "/collections/memberships";
import { v4 as uuidv4 } from 'uuid';
import {swishClient} from '../swish-client.js';
import axios from 'axios';

const findMemberForUser = async () => {
  if (Meteor.userId()) {
    const user = await Meteor.userAsync();
    const email = user?.emails?.[0]?.address;
    if (user?.emails?.[0]?.verified) {
      return Members.findOneAsync({ email });
    }
  }
};

Meteor.methods({
  findMemberForUser: findMemberForUser,
  findMembershipsForUser: async () => {
    const member = await findMemberForUser();
    return Memberships.find({ mid: member._id }).fetchAsync();
  },
  findInfoForUser: async () => {
    const member = await findMemberForUser();
    const memberships = await Memberships.find({
      mid: member._id,
    }).fetchAsync();
    memberships.sort((m1, m2) => m1.memberend > m2.memberend ? -1 : 1);
    let familyHead;
    if (member.infamily) {
      familyHead = await Memberships.findOneAsync({mid: member.infamily});
    }
    const familyId = member.infamily || member._id;
    const familyMembers = await Members.find({
      $or: [
        { infamily: familyId }, // barn i familjen
        { _id: familyId }, // familjehuvude<<<<<t
      ],
    }).fetchAsync();
    return { member, memberships, familyHead, familyMembers };
  },

  async 'swish.createTestPayment'(price) {
    const instructionId = uuidv4().replace(/-/g, '').toUpperCase()

    const data = {
      payeePaymentReference: '0123456789',
      callbackUrl: 'https://98d8-2a00-801-797-a774-9872-da91-ddbc-b667.ngrok-free.app/swish/callback',
      payeeAlias: '', // testnummer från cert
      currency: 'SEK',
      payerAlias: '', // ett fiktivt mobilnummer
      amount: price.toString(),
      message: 'Testbetalning via Meteor',
    };

    const v2url = `https://mss.cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests/${instructionId}`;
    const v1url = `https://mss.cpc.getswish.net/swish-cpcapi/api/v1/paymentrequests/${instructionId}`;
    
    await swishClient.put(v2url, data);
    await new Promise(resolve => setTimeout(resolve, 4000)); //Wait so payment-status is PAID, will handle this differntely later 
    const response = await swishClient.get(v1url);
    return response.data.status;
  }
});

