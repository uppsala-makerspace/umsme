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
  }
};

export const Loading = {
  args: {
    events: [],
    loading: true,
    error: '',
  }
};

export const Empty = {
  args: {
    events: [],
    loading: false,
    error: '',
  }
};

export const WithError = {
  args: {
    events: [],
    loading: false,
    error: 'Failed to fetch calendar: API key invalid',
  }
};
