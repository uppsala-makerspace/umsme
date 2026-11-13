import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate, useQueryParam } from '../navigation';
import { useEditor } from '../components/useEditor';
import { useChoices, memberNames, searchMembers } from '../groups/choices';
import { useCertificateList } from '../certificates/data';
import { ActivityList } from './ActivityList';
import { ActivityForm } from './ActivityForm';
import { EventList } from './EventList';
import { EventForm } from './EventForm';
import { CategoryList } from './CategoryList';
import { Participants } from './Participants';
import { CalendarImport } from './CalendarImport';
import { resolveEvent, takesRegistrations } from '/imports/common/lib/activityRules';
import {
  useActivityList, useActivity, useEventList, useEvent, useActivityChoices, useCategories,
  saveActivity, removeActivity, uploadActivityImage, removeActivityImage, activityImageUrl,
  saveEvent, removeEvent, uploadEventImage, removeEventImage, eventImageUrl,
  saveCategory, removeCategory,
  createActivityFromEvent, matchingEvents, linkEvents, calendarConfigured, calendarPreview, importCalendar,
  groupMembers, interestCount, eventRegistrations, addRegistration, withdrawRegistration, giveSeat, markAttended, closeAttendance,
} from './data';
import { activityPath, eventPath } from './paths';
import { activityValues, eventValues, parseClock, usualTimes } from '/imports/common/lib/activityValues';

const Loading = () => <Typography color="text.secondary">Loading…</Typography>;

/** /activities */
export const ActivityListPage = () => {
  const list = useActivityList();
  const choices = useChoices();
  const { categories } = useCategories();
  return (
    <ActivityList
      {...list} groupName={choices.groupName} groupWorkshops={choices.groupWorkshops}
      categoryName={(id) => categories.find((c) => c._id === id)?.name?.sv}
      workshopName={(id) => choices.workshops.find((w) => w._id === id)?.name?.sv}
    />
  );
};

/** /activities/add without an id, /activity/:_id with one. */
export const ActivityEditPage = ({ _id }) => {
  const navigate = useNavigate();
  const { loading, activity, events } = useActivity(_id);
  const choices = useChoices();
  const { loading: loadingCategories, categories } = useCategories();
  const { certificates } = useCertificateList();
  const { values, setField, loaded, run, busy, error, setError, notice, setNotice } = useEditor({ doc: activity, loading, toValues: activityValues });
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useQueryParam('tab');
  const [interested, setInterested] = useState(0);
  const [matching, setMatching] = useState(null);
  useEffect(() => { if (_id) interestCount(_id).then(setInterested, () => {}); }, [_id]);

  if (loading || choices.loading || loadingCategories) return <Loading />;
  if (_id && !activity) return <Typography color="text.secondary">There is no such activity.</Typography>;

  const common = {
    values, onChange: setField, busy, error, notice, groups: choices.groups, categories, certificates,
    workshopOptions: choices.workshopOptions, spaceOptions: choices.spaceOptions, groupName: choices.groupName,
    groupWorkshops: choices.groupWorkshops,
  };
  if (!_id) {
    return <ActivityForm isNew {...common} onSave={() => run(() => saveActivity(values, null), { then: (id) => navigate(activityPath(id)) })} />;
  }
  return (
    <ActivityForm
      isNew={false} activity={activity} events={events} {...common} interestCount={interested}
      matching={matching}
      onFindMatching={() => { setMatching('loading'); matchingEvents(_id).then(setMatching, (e) => { setMatching(null); setError(e.reason || e.message); }); }}
      onLinkMatching={(ids) => run(() => linkEvents(_id, ids), { then: (n) => { setMatching(null); setNotice(`${n} ${n === 1 ? 'event is' : 'events are'} now the activity’s.`); } })}
      onCloseMatching={() => setMatching(null)}
      onSave={() => run(() => saveActivity(values, loaded), { keep: 'all', then: () => setNotice('Saved.') })}
      imageUrl={activityImageUrl(activity)}
      uploading={uploading}
      onUploadImage={(file) => { setUploading(true); run(() => uploadActivityImage(_id, file)).finally(() => setUploading(false)); }}
      onRemoveImage={() => run(() => removeActivityImage(_id))}
      onDelete={() => run(() => removeActivity(_id), { then: () => navigate('/activities') })}
      tab={tab || 'details'} onTab={(next) => setTab(next === 'details' ? '' : next)}
    />
  );
};

/** /events */
export const EventListPage = () => {
  const list = useEventList();
  const { groupName } = useChoices();
  const [tab, setTab] = useQueryParam('tab');
  return <EventList {...list} groupName={groupName} now={new Date()} tab={tab || 'upcoming'} onTab={(next) => setTab(next === 'upcoming' ? '' : next)} />;
};

/** /events/add[?activity=…] without an id, /event/:_id with one. */
export const EventEditPage = ({ _id }) => {
  const navigate = useNavigate();
  const [activityParam] = useQueryParam('activity');
  const { loading, event } = useEvent(_id);
  const choices = useChoices();
  const { loading: loadingActivities, activities } = useActivityChoices();
  const { loading: loadingCategories, categories } = useCategories();
  const { certificates } = useCertificateList();
  const { values, setField, loaded, run, busy, error, setError, notice, setNotice } = useEditor({
    doc: event, loading, toValues: (e) => eventValues(e, { activityId: activityParam }),
  });
  // The activity the form is of now, whole, for what the event inherits.
  const { activity } = useActivity(values.activityId || null);
  const [names, setNames] = useState({});
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useQueryParam('tab');

  // The registrations, fetched again after every change to them or the event.
  const [registrations, setRegistrations] = useState(null);
  const savedVersion = event?.updatedAt?.getTime();
  const reloadRegistrations = () => (_id ? eventRegistrations(_id).then(setRegistrations, (e) => setError(e.reason || e.message)) : null);
  useEffect(() => { reloadRegistrations(); }, [_id, savedVersion, event?.seatsTaken, event?.status]);
  const act = (action) => run(action, { then: reloadRegistrations });

  // A new event takes its activity's usual times, where it has none yet.
  useEffect(() => {
    if (_id || !activity) return;
    for (const [field, value] of Object.entries(usualTimes(values, activity))) setField(field, value);
  }, [activity?._id]);

  // The active members of the event's group (its activity's), to pick hosts from.
  const hostGroupId = (values.activityId ? activity?.groupId : values.groupId) || null;
  const [members, setMembers] = useState([]);
  useEffect(() => {
    if (!hostGroupId) { setMembers([]); return; }
    groupMembers(hostGroupId).then((found) => {
      setMembers(found);
      setNames((n) => ({ ...n, ...Object.fromEntries(found.map((m) => [m._id, m])) }));
    }, () => setMembers([]));
  }, [hostGroupId]);

  const hostIds = values.hostMemberIds.join(',');
  useEffect(() => {
    const unknown = values.hostMemberIds.filter((id) => !names[id]);
    if (unknown.length) {
      memberNames(unknown).then((found) => setNames((n) => ({ ...n, ...Object.fromEntries(found.map((m) => [m._id, m])) })), () => {});
    }
  }, [hostIds]);

  if (loading || choices.loading || loadingActivities || loadingCategories) return <Loading />;
  if (_id && !event) return <Typography color="text.secondary">There is no such event.</Typography>;

  const save = (then) => {
    if (!values.startDay || !parseClock(values.startTime)) {
      setError('An event needs a day and a time it starts.');
      return;
    }
    run(() => saveEvent(values, loaded), then);
  };
  const common = {
    values, onChange: setField, busy, error, notice, activity, activities, groups: choices.groups, categories, certificates,
    workshopOptions: choices.workshopOptions, spaceOptions: choices.spaceOptions, groupName: choices.groupName,
    groupWorkshops: choices.groupWorkshops,
    hosts: values.hostMemberIds.map((id) => names[id] || { _id: id, name: id }),
    onAddHost: (member) => {
      setNames((n) => ({ ...n, [member._id]: member }));
      setField('hostMemberIds', [...values.hostMemberIds, member._id]);
    },
    onRemoveHost: (memberId) => setField('hostMemberIds', values.hostMemberIds.filter((id) => id !== memberId)),
    searchMembers,
    groupMembers: members,
  };
  if (!_id) {
    return <EventForm isNew {...common} onSave={() => save({ then: (id) => navigate(eventPath(id)) })} />;
  }
  return (
    <EventForm
      isNew={false} event={event} {...common}
      onSave={() => save({ keep: 'all', then: () => setNotice('Saved.') })}
      imageUrl={eventImageUrl(event, event.activityId ? activity : null)}
      ownImage={!!event.imageFileId}
      uploading={uploading}
      onUploadImage={(file) => { setUploading(true); run(() => uploadEventImage(_id, file)).finally(() => setUploading(false)); }}
      onRemoveImage={() => run(() => removeEventImage(_id))}
      onDelete={() => run(() => removeEvent(_id), { then: () => navigate(event.activityId ? activityPath(event.activityId, 'events') : '/events') })}
      tab={tab || 'details'} onTab={(next) => setTab(next === 'details' ? '' : next)}
      onMakeActivity={() => run(() => createActivityFromEvent(_id), { then: (id) => navigate(activityPath(id, 'events')) })}
      participantCount={registrations?.filter((r) => ['approved', 'checkedIn', 'attended', 'queued'].includes(r.state)).length}
      participants={(() => {
        const resolved = resolveEvent(event, event.activityId ? activity : null);
        return (
          <Participants
            registrations={registrations} seats={resolved.maxSeats} busy={busy}
            started={event.start <= new Date()} attendanceClosed={!!event.attendanceClosedAt}
            takesRegistrations={takesRegistrations(resolved)} search={searchMembers}
            onAdd={(member) => act(() => addRegistration(_id, member._id))}
            onWithdraw={(memberId) => act(() => withdrawRegistration(_id, memberId))}
            onTakeSeat={(memberId) => act(() => giveSeat(_id, memberId))}
            onAttended={(memberId, attended) => act(() => markAttended(_id, memberId, attended))}
            onCloseAttendance={() => act(() => closeAttendance(_id))}
          />
        );
      })()}
    />
  );
};

/** /activities/categories */
export const CategoryListPage = () => {
  const { loading, categories } = useCategories();
  const { activities } = useActivityList();
  const { events } = useEventList();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const attempt = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError(e.reason || e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return (
    <CategoryList
      loading={loading} categories={categories} busy={busy} error={error}
      usage={(id) => activities.filter((a) => a.categoryId === id).length + events.filter((e) => e.categoryId === id).length}
      onSave={(values, category) => attempt(() => saveCategory(values, category))}
      onDelete={(category) => attempt(() => removeCategory(category._id))}
    />
  );
};

const isoDay = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dayAt = (text, end = false) => {
  const [y, m, d] = text.split('-').map(Number);
  return end ? new Date(y, m - 1, d + 1) : new Date(y, m - 1, d);
};

/** /events/import */
export const CalendarImportPage = () => {
  const today = new Date();
  const [from, setFrom] = useState(isoDay(new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())));
  const [to, setTo] = useState(isoDay(new Date(today.getFullYear(), today.getMonth() + 6, today.getDate())));
  const [configured, setConfigured] = useState(null);
  const [items, setItems] = useState(null);
  const [chosen, setChosen] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  useEffect(() => { calendarConfigured().then(setConfigured, () => setConfigured(false)); }, []);

  const attempt = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e.reason || e.message);
    }
    setBusy(false);
  };
  const fetchItems = async () => {
    const found = await calendarPreview(dayAt(from), dayAt(to, true));
    setItems(found);
    setChosen(found.filter((i) => !i.eventId).map((i) => i.googleEventId));
  };
  return (
    <CalendarImport
      configured={configured} from={from} to={to} onFrom={setFrom} onTo={setTo}
      items={items} chosen={chosen} onChoose={setChosen} busy={busy} error={error} notice={notice}
      onFetch={() => { setNotice(null); attempt(fetchItems); }}
      onImport={() => attempt(async () => {
        const { created, skipped } = await importCalendar(dayAt(from), dayAt(to, true), chosen);
        await fetchItems();
        setNotice(`${created} imported${skipped ? `, ${skipped} skipped` : ''}.`);
      })}
    />
  );
};

