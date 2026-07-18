import './AppBody.html';

// Collapsed state of the sidebar sections, persisted across page loads.
const COLLAPSED_KEY = 'adminMenuCollapsed';

const readCollapsed = () => {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSED_KEY)) || {};
  } catch (e) {
    return {};
  }
};

Template.AppBody.onRendered(function () {
  const collapsed = readCollapsed();
  this.findAll('.menu-section').forEach((section) => {
    section.classList.toggle('menu-collapsed', !!collapsed[section.dataset.section]);
  });
});

Template.AppBody.events({
  'click #hamburger'() {
    document.getElementById('sidebar').classList.toggle('sidebar-open');
  },
  'click #sidebar a'() {
    document.getElementById('sidebar').classList.remove('sidebar-open');
  },
  'click .menu-heading'(event) {
    const section = event.currentTarget.closest('.menu-section');
    section.classList.toggle('menu-collapsed');
    const collapsed = readCollapsed();
    collapsed[section.dataset.section] = section.classList.contains('menu-collapsed');
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed));
  },
});
