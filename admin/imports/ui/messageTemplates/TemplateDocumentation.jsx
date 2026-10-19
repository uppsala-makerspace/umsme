import React from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { TEMPLATE_VARIABLE_GROUPS } from '/imports/common/lib/messageTemplates';

const EXAMPLE = `Hej <%= name %>,

Det här är en påminnelse om att förnya ditt medlemskap i Uppsala Makerspace.
Ditt medlemskap går ut den <%= memberEndDate %>.

Medlemskapsperiod: <%= memberStartDate %> – <%= memberEndDate %>
Medlemskapstyp: <% if (family) { %>Familj<% } else { %>Individ<% } %>
Labbmedlemskapsperiod: <%= labStartDate %> – <%= labEndDate %>`;

/** What a template can use: the variables by template type, and an example. */
export const TemplateDocumentation = () => (
  <Box component="section" sx={{ mt: 5 }}>
    <Typography variant="h5" component="h2" sx={{ mb: 1 }}>Writing a template</Typography>
    <Typography variant="body2" sx={{ mb: 2 }}>
      <code>{'<%= name %>'}</code> inserts a value, <code>{'<% if (family) { %> … <% } %>'}</code> runs code.
      Dates are written YYYY-MM-DD, e.g. 2019-12-31.
    </Typography>
    {TEMPLATE_VARIABLE_GROUPS.map(({ title, note, variables }) => (
      <Box key={title} sx={{ mb: 3 }}>
        <Typography variant="h6" component="h3">Variables: {title.toLowerCase()}</Typography>
        {note && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{note}</Typography>}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 180 }}>Variable</TableCell>
              <TableCell sx={{ width: 220 }}>Type</TableCell>
              <TableCell>Explanation</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {variables.map(({ name, type, description }) => (
              <TableRow key={name}>
                <TableCell><code>{name}</code></TableCell>
                <TableCell>{type}</TableCell>
                <TableCell>{description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    ))}
    <Typography variant="h6" component="h3">Example: a reminder</Typography>
    <Box component="pre" sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, whiteSpace: 'pre-wrap', fontSize: 13 }}>{EXAMPLE}</Box>
  </Box>
);
