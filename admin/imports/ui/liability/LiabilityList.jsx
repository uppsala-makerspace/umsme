import React from 'react';
import {
  Box, Button, Link, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { toDateInput } from './data';

/** The liability agreement versions, newest first. The newest is in force. */
export const LiabilityList = ({ loading, documents }) => (
  <Box>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h4" component="h1">Liability documents</Typography>
      <Button variant="contained" href="/liability/add">Add liability document</Button>
    </Stack>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Members are asked to approve the version with the latest date. Adding a version asks everyone to approve again.
    </Typography>
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell sx={{ width: 160 }}>Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc._id} hover>
              <TableCell><Link href={`/liability/${doc._id}`} underline="hover" sx={{ fontWeight: 600 }}>{doc.title}</Link></TableCell>
              <TableCell>{toDateInput(doc.date)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {(loading || documents.length === 0) && (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          {loading ? 'Loading…' : 'No versions yet.'}
        </Typography>
      )}
    </TableContainer>
  </Box>
);
