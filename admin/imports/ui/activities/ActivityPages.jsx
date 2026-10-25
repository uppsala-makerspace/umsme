import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate, useQueryParam } from '../navigation';
import { useEditor } from '../components/useEditor';
import { useChoices, memberNames, searchMembers } from '../groups/choices';
import { ActivityList } from './ActivityList';
import { ActivityForm } from './ActivityForm';
import { EventList } from './EventList';
import { EventForm } from './EventForm';
import { CategoryList } from './CategoryList';
import {
  useActivityList, useActivity, useEventList, useEvent, useActivityChoices, useCategories,
  saveActivity, removeActivity, uploadActivityImage, removeActivityImage, activityImageUrl,
  saveEvent, removeEvent, uploadEventImage, removeEventImage, eventImageUrl,
  saveCategory, removeCategory,
} from './data';
import { activityPath, eventPath } from './paths';
import { activityValues, eventValues, parseClock } from './values';

const Loading = () => <Typography color="text.secondary">Loading…</Typography>;

/** /activities */
export const ActivityListPage = () => {
  const list = useActivityList();
  const choices = useChoices();
  const { categories } = useCategories();
  return (
    <ActivityList
      {...list} groupName={choices.groupName}
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
  const { values, setField, loaded, run, busy, error, notice, setNotice } = useEditor({ doc: activity, loading, toValues: activityValues });
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useQueryParam('tab');

  if (loading || choices.loading || loadingCategories) return <Loading />;
  if (_id && !activity) return <Typography color="text.secondary">There is no such activity.</Typography>;

  const common = {
    values, onChange: setField, busy, error, notice, groups: choices.groups, categories,
    workshopOptions: choices.workshopOptions, spaceOptions: choices.spaceOptions, groupName: choices.groupName,
  };
  if (!_id) {
    return <ActivityForm isNew {...common} onSave={() => run(() => saveActivity(values, null), { then: (id) => navigate(activityPath(id)) })} />;
  }
  return (
    <ActivityForm
      isNew={false} activity={activity} events={events} {...common}
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
  const { values, setField, loaded, run, busy, error, setError, notice, setNotice } = useEditor({
    doc: event, loading, toValues: (e) => eventValues(e, { activityId: activityParam }),
  });
  // The activity the form is of now, whole, for what the event inherits.
  const { activity } = useActivity(values.activityId || null);
  const [names, setNames] = useState({});
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useQueryParam('tab');

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
    values, onChange: setField, busy, error, notice, activity, activities, groups: choices.groups, categories,
    workshopOptions: choices.workshopOptions, spaceOptions: choices.spaceOptions, groupName: choices.groupName,
    hosts: values.hostMemberIds.map((id) => names[id] || { _id: id, name: id }),
    onAddHost: (member) => {
      setNames((n) => ({ ...n, [member._id]: member }));
      setField('hostMemberIds', [...values.hostMemberIds, member._id]);
    },
    onRemoveHost: (memberId) => setField('hostMemberIds', values.hostMemberIds.filter((id) => id !== memberId)),
    searchMembers,
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
