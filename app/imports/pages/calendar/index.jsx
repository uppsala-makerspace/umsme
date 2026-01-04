import { Meteor } from "meteor/meteor";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "/imports/components/LanguageSwitcher/langueSwitcher";
import { HamburgerMenu } from "/imports/components/HamburgerMenu/HamburgerMenu";
import Calendar from "./Calendar";

const fetchCalendarEvents = async (apiKey, calendarId, pageToken = null) => {
  const now = new Date().toISOString();
  let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${now}&maxResults=10&singleEvents=true&orderBy=startTime`;
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch calendar: ${response.statusText}`);
  }

  const data = await response.json();
  const events = data.items.map(item => ({
    id: item.id,
    summary: item.summary || 'Untitled',
    start: item.start.dateTime || item.start.date,
    end: item.end.dateTime || item.end.date,
    location: item.location,
    description: item.description,
  }));

  return { events, nextPageToken: data.nextPageToken };
};

export default () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [nextPageToken, setNextPageToken] = useState(null);

  const getSettings = () => Meteor.settings?.public?.googleCalendar;

  useEffect(() => {
    const loadEvents = async () => {
      const settings = getSettings();
      if (!settings?.apiKey || !settings?.calendarId) {
        setError("Google Calendar not configured");
        setLoading(false);
        return;
      }

      try {
        const result = await fetchCalendarEvents(settings.apiKey, settings.calendarId);
        setEvents(result.events);
        setNextPageToken(result.nextPageToken);
      } catch (err) {
        console.error("Failed to fetch calendar events:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const handleLoadMore = async () => {
    const settings = getSettings();
    if (!settings || !nextPageToken) return;

    setLoadingMore(true);
    try {
      const result = await fetchCalendarEvents(settings.apiKey, settings.calendarId, nextPageToken);
      setEvents(prev => [...prev, ...result.events]);
      setNextPageToken(result.nextPageToken);
    } catch (err) {
      console.error("Failed to load more events:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <LanguageSwitcher />
      <HamburgerMenu />
      <Calendar
        events={events}
        loading={loading}
        error={error}
        hasMore={!!nextPageToken}
        loadingMore={loadingMore}
        onLoadMore={handleLoadMore}
      />
    </>
  );
};
