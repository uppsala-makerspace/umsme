# UMSME - Uppsala MakerSpace MEmber administrative system

This is a monorepo containing three Meteor applications:

- `app` - Member-facing PWA (Progressive Web Application) for desktop and mobile
- `admin` - Administrator interface for database management
- `payment` - Payment callback service for processing Swish payments

See the README in each directory for more details.

## Common

The `common` directory contains schema definitions, collections, and utility functions shared across all applications. It is accessible via symlinks from each app's `imports/common`.

## Admin

Uses publications and Meteor reactivity to keep data in sync between the database and frontend.
Built with Collection2, Blaze, FlowRouter, Tabular, AutoForm, and Bootstrap 3.

## App

Uses Meteor methods to fetch data.
Built with React, React Router, and Tailwind CSS.

## Payment

Minimal server-only application that receives Swish payment callbacks and processes them into the shared database.
