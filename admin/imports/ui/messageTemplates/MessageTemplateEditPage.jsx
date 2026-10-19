import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { testTemplates } from '/imports/common/lib/messageTemplates';
import { CommentsFor } from '../comments/CommentsFor';
import { useNavigate } from '../navigation';
import { MessageTemplateForm } from './MessageTemplateForm';
import { useMessageTemplate, formValues, saveMessageTemplate, removeMessageTemplate } from './data';

/** /templates/add without an id, /template/:_id with one. */
export const MessageTemplateEditPage = ({ _id }) => {
  const navigate = useNavigate();
  const { loading, template } = useMessageTemplate(_id);
  const [values, setValues] = useState(formValues(null));
  // The template as it was when the form opened; saving sends its `modified`
  // so that a change made meanwhile is refused rather than overwritten.
  const [loaded, setLoaded] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (loading || !template) return;
    setLoaded(template);
    setValues(formValues(template));
  }, [template?._id, loading]);

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      navigate('/templates');
    } catch (e) {
      setError(e.reason || e.message);
      setBusy(false);
    }
  };

  const save = () => {
    const result = testTemplates(values);
    if (result.hasError) {
      setTestResult(result);
      return;
    }
    run(() => saveMessageTemplate(values, loaded));
  };

  if (_id && loading) return <Typography color="text.secondary">Loading…</Typography>;
  if (_id && !template) return <Typography color="text.secondary">There is no such message template.</Typography>;
  return (
    <MessageTemplateForm
      isNew={!_id}
      values={values}
      onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
      onSave={save}
      onTest={() => setTestResult(testTemplates(values))}
      testResult={testResult}
      onDelete={() => run(() => removeMessageTemplate(_id))}
      busy={busy}
      error={error}
    >
      {_id && <Box sx={{ mt: 4 }}><CommentsFor about={_id} /></Box>}
    </MessageTemplateForm>
  );
};
