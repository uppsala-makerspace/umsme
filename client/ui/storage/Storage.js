import './Storage.html';
import { Members } from '../../../collections/members.js';

Template.Storage.onCreated(() => {
  Meteor.subscribe('members');
});


const getBoxes = () => {
  const idx = {};
  const now = new Date();
  Members.find({}).forEach((member) => {
    if (typeof member.storage === 'number') {
      idx[member.storage] = member;
    }
  });
  const arr = [];
  for (let i = 1; i <= 150; i++) {
    const member = idx[i];
    const occupied = member !== undefined
    const overdue = member && member.lab < now;
    const lab = member && member.lab ? member.lab.toISOString().substring(0,10) : '';
    const error = member && !member.lab;
    const tooltip = member ? `${member.name} - ${lab}` : `Box nr ${i}`;
    const cls = `${occupied ? 'occupied': ''} ${overdue ? 'overdue': ''} ${error ? 'error' : ''}`;
    arr.push({nr: i, occupied, overdue, tooltip, member, class: cls});
  }
  return arr;
};

Template.Storage.helpers({
  boxes: getBoxes,
  walls: () => {
    const boxes = getBoxes();
    const walls = [];
    const amountOfWalls = Math.ceil(boxes.length / 96);
    for (let wallCount = 0; wallCount < amountOfWalls ; wallCount++) {
      const shelves = [];
      walls.push({
        nr: wallCount+1,
        shelves
      });
      const wallBoxes = boxes.slice(wallCount * 96, wallCount * 96 + 96);
      const amountOfShelves = Math.ceil(wallBoxes.length / 12);
      for (let shelfCount = 0; shelfCount < amountOfShelves ; shelfCount++) {
        const shelfBoxes = wallBoxes.slice(shelfCount * 12,shelfCount * 12 + 12);
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
  }
});