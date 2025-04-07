import './Storage.html';
import { Members } from '/collections/members.js';
import { Comments } from '/collections/comments.js';
import { ReactiveDict } from 'meteor/reactive-dict';

Template.Storage.onCreated(() => {
  Meteor.subscribe('members');
  Meteor.subscribe('comments');
});

const maxBoxes = 204;
const wallSize = 108;
const shelfSize = 12;

const getComments = () => {
  const box2Comment = {};
  Comments.find({}).forEach((comment) => {
    if (comment.about.startsWith('_box')) {
      box2Comment[comment.about.substring(5)] = comment;
    }
  });
  return box2Comment;
}

const getBoxes = () => {
  const idx = {};
  const now = new Date();
  Members.find({}).forEach((member) => {
    if (typeof member.storage === 'number') {
      idx[member.storage] = member;
    }
  });
  const arr = [];
  const box2comments = getComments();
  for (let i = 1; i <= maxBoxes; i++) {
    const member = idx[i];
    const occupied = member !== undefined
    const overdue = member && member.lab < now;
    const lab = member && member.lab ? member.lab.toISOString().substring(0,10) : '';
    const error = member && !member.lab;
    const tooltip = member ? `${member.name} - ${lab}` : `Box nr ${i}`;
    const comment = box2comments[i]?.text;
    const cls = `${occupied ? 'occupied': ''} ${overdue ? 'overdue': ''} ${error ? 'error' : ''} ${comment ? 'comment': ''}`;
    arr.push({nr: i, occupied, overdue, tooltip, member, class: cls, comment});
  }
  return arr;
};

Template.Storage.onCreated(function() {
  Meteor.subscribe('payments');
  this.state = new ReactiveDict();
  this.state.set('editBox', '');
  this.state.set('editBoxMember', '');
});

Template.Storage.helpers({
  boxes: getBoxes,
  comment: (box) => {
    let comments = getComments();
    let comment = comments[box];
    return comment ? comment.text : '';
  },
  members: () => {
    return Members.find();
  },
  editBox: () => {
    return Template.instance().state.get('edit');
  },
  status: () => {
    const boxes = getBoxes();
    return {
      boxes: boxes.filter(box => box.occupied).length,
      overdue: boxes.filter(box => box.overdue).length,
      unknown: boxes.filter(box => !box.occupied && box.comment).length,
      free: boxes.filter(box => !box.occupied && !box.comment).length,
    };
  },
  walls: () => {
    const boxes = getBoxes();
    const walls = [];
    const amountOfWalls = Math.ceil(boxes.length / wallSize);
    for (let wallCount = 0; wallCount < amountOfWalls ; wallCount++) {
      const shelves = [];
      walls.push({
        nr: wallCount+1,
        shelves
      });
      const wallBoxes = boxes.slice(wallCount * wallSize, wallCount * wallSize + wallSize);
      const amountOfShelves = Math.ceil(wallBoxes.length / shelfSize);
      for (let shelfCount = 0; shelfCount < amountOfShelves ; shelfCount++) {
        const shelfBoxes = wallBoxes.slice(shelfCount * shelfSize,shelfCount * shelfSize + shelfSize);
        const col1 = [];
        const col2 = [];
        for (let boxCount = 0; boxCount < shelfBoxes.length; boxCount += 2) {
          col1.push(shelfBoxes[boxCount]);
          col2.push(shelfBoxes[boxCount + 1]);
        }
        shelves.push({col1, col2});
      }
    }
    return walls;
  },
  boxEquals: function(box){
    return box == Template.instance().state.get('editBox');
  },
  memberEquals: function(member) {
    return member == Template.instance().state.get('editBoxMember');
  }
});

Template.Storage.events({
  'click .editBox': function (event, instance) {
    const box = event.target.dataset.box;
    instance.state.set('editBox', box);
    const boxes = getBoxes();
    const boxObj = boxes.find(b => b.nr == box);
    instance.state.set('editBoxMember', boxObj && boxObj.member ? boxObj.member._id : '');
  },
  'click .doneBox': function (event, instance) {
    instance.state.set('editBox', '');
  },
  'change #memberselect': function(event, instance) {
    const beforeMemberId = instance.state.get('editBoxMember');
    const afterMemberId = event.target.value;
    if (beforeMemberId !== '') {
      Members.update(beforeMemberId, {$unset: {storage: ''}});
    }
    if (afterMemberId !== '') {
      Members.update(afterMemberId, {$set: {storage: instance.state.get('editBox')}});
    }
    instance.state.set('editBoxMember', afterMemberId);
  },
  'blur .boxComment': function(event, instance) {
    const editBox = instance.state.get('editBox');
    const comments = getComments();
    const currentComment = comments[editBox];
    if (currentComment) {
      Comments.update(currentComment._id, {$set: {text: event.target.value, modified: new Date()}});
    } else {
      Comments.insert({text: event.target.value, modified: new Date(), created: new Date(), about: `_box_${editBox}`});
    }
    instance.state.set('comments', getComments());
  }
});