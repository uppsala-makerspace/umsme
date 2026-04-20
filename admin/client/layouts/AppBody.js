import './AppBody.html';

Template.AppBody.events({
  'click #hamburger'() {
    document.getElementById('sidebar').classList.toggle('sidebar-open');
  },
  'click #sidebar a'() {
    document.getElementById('sidebar').classList.remove('sidebar-open');
  },
});
