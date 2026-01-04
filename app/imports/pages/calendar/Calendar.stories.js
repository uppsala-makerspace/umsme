import Calendar from './Calendar';

export default {
  title: 'UMSAPP/Calendar',
  component: Calendar,
  parameters: {},
  tags: ['autodocs']
};

const sampleEvents = [
  {
    id: '1',
    summary: 'Open Evening',
    start: new Date(Date.now() + 86400000).toISOString(),
    end: new Date(Date.now() + 86400000 + 10800000).toISOString(),
    location: 'Uppsala Makerspace',
    description: 'Join us for our weekly open evening!'
  },
  {
    id: '2',
    summary: '3D Printing Workshop',
    start: new Date(Date.now() + 172800000).toISOString(),
    end: new Date(Date.now() + 172800000 + 7200000).toISOString(),
    location: 'Uppsala Makerspace',
    description: 'Learn the basics of 3D printing.'
  },
  {
    id: '3',
    summary: 'Board Meeting',
    start: new Date(Date.now() + 604800000).toISOString(),
    end: new Date(Date.now() + 604800000 + 3600000).toISOString(),
  },
];

export const WithEvents = {
  args: {
    events: sampleEvents,
    loading: false,
    error: '',
    mode: 'upcoming',
    onModeChange: (mode) => console.log('Mode changed to:', mode),
  }
};

export const Loading = {
  args: {
    events: [],
    loading: true,
    error: '',
    mode: 'upcoming',
    onModeChange: () => {},
  }
};

export const Empty = {
  args: {
    events: [],
    loading: false,
    error: '',
    mode: 'upcoming',
    onModeChange: (mode) => console.log('Mode changed to:', mode),
  }
};

export const EmptyPastEvents = {
  args: {
    events: [],
    loading: false,
    error: '',
    mode: 'past',
    onModeChange: (mode) => console.log('Mode changed to:', mode),
  }
};

export const WithError = {
  args: {
    events: [],
    loading: false,
    error: 'Failed to fetch calendar: API key invalid',
    mode: 'upcoming',
    onModeChange: () => {},
  }
};

const eventsWithLinks = [
  {
    id: '1',
    summary: 'Open Evening',
    start: new Date(Date.now() + 86400000).toISOString(),
    end: new Date(Date.now() + 86400000 + 10800000).toISOString(),
    location: 'Uppsala Makerspace',
    description: '<p>Join us for our <strong>weekly open evening!</strong></p><ul><li>Meet members</li><li>See projects</li><li>Ask questions</li></ul><p>More info at <a href="https://uppsalamakerspace.se">our website</a>.</p>'
  },
  {
    id: '2',
    summary: 'Laser Cutter Workshop',
    start: new Date(Date.now() + 259200000).toISOString(),
    end: new Date(Date.now() + 259200000 + 7200000).toISOString(),
    location: 'Uppsala Makerspace',
    description: '<p>Sign up at <a href="https://example.com/signup">this link</a>. Read the <a href="https://example.com/safety">safety guidelines</a> before attending.</p>'
  },
];

export const WithLinks = {
  name: 'With Clickable Links',
  args: {
    events: eventsWithLinks,
    loading: false,
    error: '',
    mode: 'upcoming',
    onModeChange: (mode) => console.log('Mode changed to:', mode),
  }
};

export const WithLoadMore = {
  args: {
    events: sampleEvents,
    loading: false,
    error: '',
    hasMore: true,
    loadingMore: false,
    onLoadMore: () => alert('Load more clicked'),
    mode: 'upcoming',
    onModeChange: (mode) => console.log('Mode changed to:', mode),
  }
};

export const LoadingMore = {
  args: {
    events: sampleEvents,
    loading: false,
    error: '',
    hasMore: true,
    loadingMore: true,
    onLoadMore: () => {},
    mode: 'upcoming',
    onModeChange: () => {},
  }
};

const pastEvents = [
  {
    id: '1',
    summary: 'Christmas Party',
    start: new Date(Date.now() - 86400000).toISOString(),
    end: new Date(Date.now() - 86400000 + 14400000).toISOString(),
    location: 'Uppsala Makerspace',
    description: 'Annual Christmas celebration'
  },
  {
    id: '2',
    summary: 'Arduino Workshop',
    start: new Date(Date.now() - 172800000).toISOString(),
    end: new Date(Date.now() - 172800000 + 7200000).toISOString(),
    location: 'Uppsala Makerspace',
    description: 'Introduction to Arduino programming'
  },
];

export const PastEvents = {
  args: {
    events: pastEvents,
    loading: false,
    error: '',
    hasMore: true,
    loadingMore: false,
    onLoadMore: () => alert('Load older events clicked'),
    mode: 'past',
    onModeChange: (mode) => console.log('Mode changed to:', mode),
  }
};
