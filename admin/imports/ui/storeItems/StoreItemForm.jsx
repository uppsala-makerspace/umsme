import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ImageField } from '../components/ImageField';

const Section = ({ title, children }) => (
  <Box component="section" sx={{ mt: 4 }}>
    <Typography variant="h6" component="h2" sx={{ mb: 1 }}>{title}</Typography>
    {children}
  </Box>
);

const Confirm = ({ open, title, text, confirmLabel, onCancel, onConfirm, busy }) => (
  <Dialog open={open} onClose={onCancel}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent><DialogContentText>{text}</DialogContentText></DialogContent>
    <DialogActions>
      <Button onClick={onCancel}>Cancel</Button>
      <Button color="error" variant="contained" disabled={busy} onClick={onConfirm}>{confirmLabel}</Button>
    </DialogActions>
  </Dialog>
);

/**
 * Add a store item, or show and edit one: its fields, image, workshops and
 * sales. A new item gets only the basic fields; the rest are set on its page.
 *
 * @param {{ isNew: boolean, item?: object, values: object, onChange: (field, value) => void,
 *           onSave: () => void, busy?: boolean, error?: string, notice?: string,
 *           workshops?: Array<{ _id, name, isArea, checked }>, onToggleWorkshop?: (id, checked) => void,
 *           imageUrl?: string, onUploadImage?: (file) => void, onRemoveImage?: () => void, uploading?: boolean,
 *           sales?: { count: number, total: number }, onDelete?: () => void }} props
 */
export const StoreItemForm = ({
  isNew, item, values, onChange, onSave, busy = false, error, notice,
  workshops = [], onToggleWorkshop, imageUrl, onUploadImage, onRemoveImage, uploading = false,
  sales, onDelete,
}) => {
  const [confirming, setConfirming] = useState(null);
  const text = (name) => ({ value: values[name], onChange: (e) => onChange(name, e.target.value) });
  const amount = (name) => ({ ...text(name), type: 'number', slotProps: { htmlInput: { min: 1 } } });
  const flag = (name) => ({ checked: values[name], onChange: (e) => onChange(name, e.target.checked) });
  const title = [item?.name?.sv, item?.name?.en].filter(Boolean).join(' / ');
  const bought = sales?.count > 0;
  const deleteBlocked = item?.imageFileId
    ? 'Remove the image before the item can be deleted.'
    : bought && 'This item has been bought. Set its status to hidden instead — deleting it would leave payments pointing at nothing, in the purchase history and in the bookkeeping export.';

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Link href="/storeitems" underline="hover" variant="body2">← Store items</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 2 }}>
        <Typography variant="h4" component="h1">
          {isNew ? 'Add store item' : `Store item: ${title}`}
          {item?.status === 'hidden' && <Chip label="Hidden" size="small" sx={{ ml: 1, verticalAlign: 'middle' }} />}
        </Typography>
        {!isNew && !deleteBlocked && sales && (
          <Button color="error" variant="outlined" onClick={() => setConfirming('delete')}>Delete</Button>
        )}
      </Stack>

      {isNew && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The code goes into the Swish message as <code>ws:&lt;code&gt;</code>, so keep it short: Swish cuts the message at
          50 characters. Lower case, digits and hyphens only. The image, workshops, price bounds and comment placeholder
          are set on the item&apos;s page once it exists.
        </Typography>
      )}
      {!isNew && !item?.bookkeepingAccount && (
        <Alert severity="warning" sx={{ mb: 2 }}>No bookkeeping account. Purchases of this item turn up as unclassified payments in every bank reconciliation until one is set.</Alert>
      )}
      {!isNew && item && typeof item.price !== 'number' && (
        <Alert severity="info" sx={{ mb: 2 }}>No fixed price, so the buyer enters the amount. Set a minimum and maximum below unless any amount really is acceptable.</Alert>
      )}
      {!isNew && deleteBlocked && <Alert severity="info" sx={{ mb: 2 }}>{deleteBlocked}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Code" required sx={{ minWidth: 200 }} slotProps={{ htmlInput: { pattern: '[a-z0-9\\-]+', maxLength: 12 } }}
            helperText="a–z, 0–9 and -" {...text('code')} />
          <TextField label="Name (Swedish)" required fullWidth {...text('nameSv')} />
          <TextField label="Name (English)" fullWidth {...text('nameEn')} />
        </Stack>
        {!isNew && (
          <Stack spacing={2} sx={{ mb: 2 }}>
            <TextField label="Description (Swedish, markdown)" multiline minRows={3} fullWidth {...text('descriptionSv')} />
            <TextField label="Description (English, markdown)" multiline minRows={3} fullWidth {...text('descriptionEn')} />
          </Stack>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Price (kr) — leave empty to let the buyer set it" fullWidth {...amount('price')} />
          {!isNew && <TextField label="Minimum (kr) — only for a buyer-set price" fullWidth {...amount('minPrice')} />}
          {!isNew && <TextField label="Maximum (kr) — only for a buyer-set price" fullWidth {...amount('maxPrice')} />}
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1 }}>
          <TextField label="Bookkeeping account" required sx={{ minWidth: 200 }} {...text('bookkeepingAccount')} />
          <TextField label="Status" select sx={{ minWidth: 180 }} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} {...text('status')}>
            <option value="available">Available</option>
            <option value="hidden">Hidden</option>
          </TextField>
          {!isNew && <TextField label="Sort order" type="number" sx={{ minWidth: 140 }} {...text('sortOrder')} />}
        </Stack>
        <FormGroup row sx={{ mb: 1 }}>
          <FormControlLabel control={<Checkbox {...flag('requiresMembership')} />} label="Requires membership" />
          <FormControlLabel control={<Checkbox {...flag('commentRequired')} />} label="Comment required" />
        </FormGroup>
        {!isNew && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField label="Placeholder (Swedish)" fullWidth helperText="Shown in the comment field" {...text('placeholderSv')} />
            <TextField label="Placeholder (English)" fullWidth {...text('placeholderEn')} />
          </Stack>
        )}
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained" disabled={busy}>{isNew ? 'Add store item' : 'Save'}</Button>
          <Button href="/storeitems">{isNew ? 'Cancel' : 'Back'}</Button>
        </Stack>
      </Box>

      {!isNew && (
        <>
          <Section title="Image">
            <ImageField
              src={imageUrl} alt={item?.name?.sv} accept="image/jpeg,image/png,image/webp,image/heic"
              onUpload={onUploadImage} onRemove={onRemoveImage} uploading={uploading}
            />
          </Section>

          <Section title="Workshops / areas of interest">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              The steering groups of the ones ticked see this item&apos;s sales in the app. An item can belong to several; each then sees all of its sales.
            </Typography>
            <FormGroup>
              {workshops.map((workshop) => (
                <FormControlLabel
                  key={workshop._id}
                  control={<Checkbox checked={workshop.checked} onChange={(e) => onToggleWorkshop(workshop._id, e.target.checked)} />}
                  label={workshop.isArea ? `${workshop.name} (area of interest)` : workshop.name}
                />
              ))}
            </FormGroup>
          </Section>

          <Divider sx={{ mt: 4 }} />
          <Section title="Purchases">
            <Typography variant="body2">
              {!sales ? 'Counting…' : bought
                ? <>{sales.count} purchase(s), {sales.total} kr in total. See them under <Link href="/payments">Payments</Link>.</>
                : 'Not bought yet.'}
            </Typography>
          </Section>
        </>
      )}

      <Confirm
        open={confirming === 'delete'} title="Delete this item?" busy={busy} confirmLabel="Delete"
        text={`“${title}” is removed from the web shop for good.`}
        onCancel={() => setConfirming(null)} onConfirm={() => { setConfirming(null); onDelete(); }}
      />
    </Box>
  );
};
