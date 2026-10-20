import { Meteor } from 'meteor/meteor';

/**
 * Data for the user account pages: the methods. The pages' containers use
 * this; the pure components never do.
 */

export const userPage = (query) => Meteor.callAsync('users.page', query);
export const userDetail = (userId) => Meteor.callAsync('users.detail', userId);
export const updateUser = (userId, values) => Meteor.callAsync('users.update', userId, values);
export const setUserRole = (userId, role, on) => Meteor.callAsync('users.setRole', userId, role, on);
export const removeUser = (userId) => Meteor.callAsync('users.remove', userId);
export const setPassword = (userId, password) => Meteor.callAsync('setUserPassword', userId, password);
/** Resolves to the new account's id. */
export const createUser = (username, password) => Meteor.callAsync('serverCreateUser', username, password);
