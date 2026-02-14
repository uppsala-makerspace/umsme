import { Meteor } from "meteor/meteor";
import React, { useState, useEffect } from "react";
import Layout from "/imports/components/Layout/Layout";
import Calendar from "./Calendar";

const PAST_EVENTS_DAYS = 90; // Fetch past events in 90-day windows
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // Refresh every 5 minutes

// Module-level cache for upcoming events so they survive page navigation
let upcomingCache = null; // { events, nextPageToken }

const fetchCalendarEvents = async (apiKey, calendarId, mode = "upcoming", pageToken = null, timeWindow = null) => {
  const now = new Date();
  let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&singleEvents=true&orderBy=startTime`;

  if (mode === "past") {
    // For past events, fetch a time window and reverse to show most recent first
    const timeMax = timeWindow?.end || now.toISOString();
    const timeMinDate = timeWindow?.start || new Date(now.getTime() - PAST_EVENTS_DAYS * 24 * 60 * 60 * 1000);
    const timeMin = timeMinDate.toISOString ? timeMinDate.toISOString() : timeMinDate;
    url += `&timeMin=${timeMin}&timeMax=${timeMax}`;
  } else {
    url += `&timeMin=${now.toISOString()}&maxResults=10`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch calendar: ${response.statusText}`);
  }

  const data = await response.json();
  let events = data.items.map(item => ({
    id: item.id,
    summary: item.summary || 'Untitled',
    start: item.start.dateTime || item.start.date,
    end: item.end.dateTime || item.end.date,
    location: item.location,
    description: item.description,
  }));

  // For past events, reverse to show most recent first
  if (mode === "past") {
    events = events.reverse();
  }

  return { events, nextPageToken: data.nextPageToken };
};

export default () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMorePastEvents, setHasMorePastEvents] = useState(true);
  const [oldestFetchedTime, setOldestFetchedTime] = useState(null);
  const [mode, setMode] = useState("upcoming");

  const getSettings = () => Meteor.settings?.public?.googleCalendar;

  useEffect(() => {
    const loadEvents = async () => {
      setError("");
      setNextPageToken(null);
      setHasMorePastEvents(true);
      setOldestFetchedTime(null);

      // Use cached upcoming events if available
      if (mode === "upcoming" && upcomingCache) {
        setEvents(upcomingCache.events);
        setNextPageToken(upcomingCache.nextPageToken);
        setLoading(false);
      } else {
        setLoading(true);
        setEvents([]);
      }

      const settings = getSettings();
      if (!settings?.apiKey || !settings?.calendarId) {
        setError("Google Calendar not configured");
        setLoading(false);
        return;
      }

      try {
        const result = await fetchCalendarEvents(settings.apiKey, settings.calendarId, mode);
        setEvents(result.events);
        setNextPageToken(result.nextPageToken);

        if (mode === "upcoming") {
          upcomingCache = { events: result.events, nextPageToken: result.nextPageToken };
        } else if (mode === "past") {
          // Track the oldest time window we've fetched
          const now = new Date();
          setOldestFetchedTime(new Date(now.getTime() - PAST_EVENTS_DAYS * 24 * 60 * 60 * 1000));
        }
      } catch (err) {
        // Only show error if we don't have cached data to show
        if (!upcomingCache || mode !== "upcoming") {
          console.error("Failed to fetch calendar events:", err);
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    loadEvents();

    // Periodic refresh while the page is open
    const interval = setInterval(loadEvents, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [mode]);

  const handleLoadMore = async () => {
    const settings = getSettings();
    if (!settings) return;

    setLoadingMore(true);
    try {
      if (mode === "past") {
        // For past events, fetch the previous time window
        const windowEnd = oldestFetchedTime;
        const windowStart = new Date(windowEnd.getTime() - PAST_EVENTS_DAYS * 24 * 60 * 60 * 1000);

        const result = await fetchCalendarEvents(
          settings.apiKey,
          settings.calendarId,
          mode,
          null,
          { start: windowStart, end: windowEnd.toISOString() }
        );

        setEvents(prev => [...prev, ...result.events]);
        setOldestFetchedTime(windowStart);

        // If we got no events, there might be no more
        if (result.events.length === 0) {
          setHasMorePastEvents(false);
        }
      } else {
        // For upcoming events, use pageToken
        if (!nextPageToken) return;
        const result = await fetchCalendarEvents(settings.apiKey, settings.calendarId, mode, nextPageToken);
        setEvents(prev => [...prev, ...result.events]);
        setNextPageToken(result.nextPageToken);
      }
    } catch (err) {
      console.error("Failed to load more events:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleModeChange = (newMode) => {
    if (newMode !== mode) {
      setMode(newMode);
    }
  };

  const hasMore = mode === "past" ? hasMorePastEvents : !!nextPageToken;

  return (
    <Layout>
      <Calendar
        events={events}
        loading={loading}
        error={error}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={handleLoadMore}
        mode={mode}
        onModeChange={handleModeChange}
      />
    </Layout>
  );
};
