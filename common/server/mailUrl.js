import { Meteor } from 'meteor/meteor';

/**
 * Let settings.json carry the SMTP URL, so a deployment does not have to
 * export MAIL_URL separately. Meteor's email package reads the variable when
 * a mail is sent, so this only has to run before the first send.
 */
export const applyMailUrlFromSettings = () => {
  const mailUrl = Meteor.settings?.private?.mailUrl;
  if (mailUrl) process.env.MAIL_URL = mailUrl;
};
