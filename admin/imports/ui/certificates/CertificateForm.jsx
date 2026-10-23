import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ChipSelect } from '../components/ChipSelect';
import { MemberChips } from '../components/MemberChips';
import { Section } from '../components/Section';
import { GrantForm } from './GrantForm';
import { HolderList } from './HolderList';
import { workshopPath } from '../workshops/paths';

const native = { select: { native: true }, inputLabel: { shrink: true } };

/**
 * Add a certificate, or show and edit one: its fields, workshop, certifiers,
 * prerequisites and test (saved with Save), then marking it mandatory, the
 * RFID export, and its holders, granting and revoking at once.
 *
 * @param {{ isNew: boolean, certificate?: object, values: object, onChange: (field, value) => void,
 *           onSave: () => void, busy?: boolean, error?: string, notice?: string,
 *           workshops: Array<{ _id, name, kind }>, roleOptions: Array<{ value, label }>,
 *           prerequisiteOptions: Array<{ value, label }>, certificateName: (id) => string,
 *           certifiers: Array<{ _id, name, mid }>, onAddCertifier: (member) => void,
 *           onRemoveCertifier: (memberId) => void, searchMembers: (query) => Promise<object[]>,
 *           tests: Array<{ testId, categoryCount }>|null,
 *           canMarkMandatory?: boolean, onMarkMandatory?: () => void,
 *           holders?: object[]|null, onGrant?: (grant) => Promise<any>, onRevoke?: (attestationId) => void,
 *           defaultCertifier?: object|null, onDelete?: () => void }} props
 *   `prerequisiteOptions` leaves out what would make a cycle; `tests` is null
 *   when the user may not list them.
 */
export const CertificateForm = ({
  isNew, certificate, values, onChange, onSave, busy = false, error, notice,
  workshops, roleOptions, prerequisiteOptions, certificateName,
  certifiers, onAddCertifier, onRemoveCertifier, searchMembers, tests,
  canMarkMandatory = false, onMarkMandatory, holders, onGrant, onRevoke, defaultCertifier, onDelete,
}) => {
  const [confirming, setConfirming] = useState(null);
  const text = (name) => ({ value: values[name], onChange: (e) => onChange(name, e.target.value) });
  const title = [certificate?.name?.sv, certificate?.name?.en].filter(Boolean).join(' / ');
  const workshop = workshops.find((w) => w._id === values.workshopId);
  const rfid = certificate && `/api/certificates/${certificate._id}/rfid`;
  const knownTest = !values.testId || (tests || []).some((t) => t.testId === values.testId);

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Link href="/certificates" underline="hover" variant="body2">← Certificates</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 2 }}>
        <Typography variant="h4" component="h1">
          {isNew ? 'Add certificate' : `Certificate: ${title}`}
          {certificate?.mandatory && <Chip size="small" color="primary" label="Mandatory" sx={{ ml: 1, verticalAlign: 'middle' }} />}
        </Typography>
        {!isNew && !certificate.mandatory && !holders?.length && <Button color="error" variant="outlined" onClick={() => setConfirming('delete')}>Delete certificate</Button>}
      </Stack>
      {certificate?.mandatory && (
        <Alert severity="info" sx={{ mb: 2 }}>This certificate is mandatory for membership and cannot be deleted or unmarked.</Alert>
      )}
      {!isNew && !certificate.mandatory && holders?.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>The certificate can be deleted once nobody holds it.</Typography>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Name (Swedish)" required fullWidth {...text('nameSv')} />
          <TextField label="Name (English)" fullWidth {...text('nameEn')} />
        </Stack>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <TextField label="Description (Swedish)" multiline minRows={3} fullWidth {...text('descriptionSv')} />
          <TextField label="Description (English)" multiline minRows={3} fullWidth {...text('descriptionEn')} />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Default validity (days)" type="number" sx={{ minWidth: 220 }} slotProps={{ htmlInput: { min: 1 } }}
            helperText="Empty: a granted certificate does not expire." {...text('defaultValidityDays')} />
          <Box sx={{ flex: 1 }}>
            <TextField label="Workshop or area of interest" select fullWidth slotProps={native} {...text('workshopId')}
              helperText="Where the certificate is shown in the app.">
              <option value="">(No workshop)</option>
              {workshops.map((w) => (
                <option key={w._id} value={w._id}>{w.name?.sv}{w.kind === 'areaOfInterest' ? ' (area of interest)' : ''}</option>
              ))}
            </TextField>
            {workshop && <Link href={workshopPath(workshop._id, 'references')} variant="body2">Open {workshop.name?.sv}</Link>}
          </Box>
        </Stack>

        <Typography variant="subtitle1" component="h2" sx={{ mt: 3, mb: 1 }}>Who may grant it</Typography>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <TextField label="Certifier role" select fullWidth slotProps={native} {...text('certifierRole')}
            helperText="Everyone with this role may grant the certificate, as may admin and board.">
            <option value="">(No role)</option>
            {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </TextField>
          <MemberChips
            label="Certifiers" members={certifiers} onAdd={onAddCertifier} onRemove={onRemoveCertifier}
            search={searchMembers} href={(m) => `/member/${m._id}`}
            empty="No certifiers by name; only the certifier role, if set."
          />
        </Stack>

        <Typography variant="subtitle1" component="h2" sx={{ mt: 3, mb: 1 }}>Prerequisites</Typography>
        <Box sx={{ mb: 2 }}>
          <ChipSelect
            label="Certificates needed first" options={prerequisiteOptions}
            value={values.prerequisites} onChange={(ids) => onChange('prerequisites', ids)}
            helperText="A member must hold these before they can ask for this one."
          />
          {values.prerequisites.length > 0 && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Open:{' '}
              {values.prerequisites.map((id, i) => (
                <React.Fragment key={id}>{i > 0 && ', '}<Link href={`/certificate/${id}`}>{certificateName(id)}</Link></React.Fragment>
              ))}
            </Typography>
          )}
        </Box>

        <Typography variant="subtitle1" component="h2" sx={{ mt: 3, mb: 1 }}>Test</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Awarded by passing a test in the app instead of by a certifier.
          {tests === null && ' Only an admin can choose the test.'}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Test id" select fullWidth slotProps={native} disabled={tests === null} {...text('testId')}>
            <option value="">(No test)</option>
            {!knownTest && <option value={values.testId}>{values.testId}</option>}
            {(tests || []).map((t) => <option key={t.testId} value={t.testId}>{t.testId} ({t.categoryCount} categories)</option>)}
          </TextField>
          {values.testId && (
            <>
              <TextField label="Max attempts" type="number" required sx={{ minWidth: 160 }} slotProps={{ htmlInput: { min: 1 } }} {...text('maxAttempts')} />
              <TextField label="Max errors" type="number" required sx={{ minWidth: 160 }} slotProps={{ htmlInput: { min: 0 } }} {...text('maxErrors')} />
            </>
          )}
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained" disabled={busy}>{isNew ? 'Add' : 'Save'}</Button>
          <Button href="/certificates">{isNew ? 'Cancel' : 'Back'}</Button>
        </Stack>
      </Box>

      {!isNew && (
        <>
          {!certificate.mandatory && canMarkMandatory && (
            <Section title="Mandatory for membership" note="Every member must hold a mandatory certificate to open the doors. Only one certificate can be mandatory, and it stays so.">
              <Button color="warning" variant="outlined" onClick={() => setConfirming('mandatory')}>Mark as mandatory for membership</Button>
            </Section>
          )}

          <Section title="RFID export" note="JSON list of RFID tags for members with a valid attestation; access is restricted by an IP allowlist in nginx.">
            <Stack direction="row" spacing={2}>
              <Link href={rfid} target="_blank" rel="noopener noreferrer">Open RFID JSON</Link>
              <Link href={`${rfid}?includeNames`} target="_blank" rel="noopener noreferrer">Open RFID JSON with names</Link>
            </Stack>
          </Section>

          <Section title="Holders" note="Granting and revoking take effect at once.">
            <Box sx={{ mb: 2 }}>
              <GrantForm choose="member" validityDays={certificate.defaultValidityDays} search={searchMembers}
                defaultCertifier={defaultCertifier} onGrant={onGrant} busy={busy} />
            </Box>
            <HolderList show="member" rows={holders} onRevoke={onRevoke} busy={busy} />
          </Section>
        </>
      )}

      <Dialog open={confirming === 'delete'} onClose={() => setConfirming(null)}>
        <DialogTitle>Delete this certificate?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            “{title}” is deleted for good, and no longer needed first by other certificates.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={() => { setConfirming(null); onDelete(); }}>Delete</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={confirming === 'mandatory'} onClose={() => setConfirming(null)}>
        <DialogTitle>Make this certificate mandatory?</DialogTitle>
        <DialogContent>
          <DialogContentText>Members without it can no longer open the doors. This cannot be undone here.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(null)}>Cancel</Button>
          <Button color="warning" variant="contained" disabled={busy} onClick={() => { setConfirming(null); onMarkMandatory(); }}>Mark as mandatory</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
