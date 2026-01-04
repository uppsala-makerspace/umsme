import { Meteor } from "meteor/meteor";
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from "/imports/components/LanguageSwitcher/langueSwitcher";
import { HamburgerMenu } from "/imports/components/HamburgerMenu/HamburgerMenu";
import Calendar from "./Calendar";

const fetchCalendarEvents = async (apiKey, calendarId) => {
  const now = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${now}&maxResults=20&singleEvents=true&orderBy=startTime`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch calendar: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items.map(item => ({
    id: item.id,
    summary: item.summary || 'Untitled',
    start: item.start.dateTime || item.start.date,
    end: item.end.dateTime || item.end.date,
    location: item.location,
    description: item.description,
  }));
};

export default () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadEvents = async () => {
      const settings = Meteor.settings?.public?.googleCalendar;
      if (!settings?.apiKey || !settings?.calendarId) {
        setError("Google Calendar not configured");
        setLoading(false);
        return;
      }

      try {
        const calendarEvents = await fetchCalendarEvents(settings.apiKey, settings.calendarId);
        setEvents(calendarEvents);
      } catch (err) {
        console.error("Failed to fetch calendar events:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  return (
    <>
      <LanguageSwitcher />
      <HamburgerMenu />
      <Calendar events={events} loading={loading} error={error} />
    </>
  );
};
