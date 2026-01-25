# UMSME - Uppsala MakerSpace MEmber administrative system

This is a monorepo containing:

- `app` a user centered PWA (Progressive Web Application) that can be used on both desktop and in mobile
- `admin` a user interface targeting administrators that works more closely with the database

See READMEs for app and admin for more details.

## Common functionality

Both applications are meteor applications that makes use of the authentification and authorization mechanisms provided by Meteor.
There is a `common` directory containing schema definitions, collections and some utility functionality that is common across both applications.
The common directory is made accessible via soft links into both applications.

## Admin

Admin makes heavy use of publications and meteor reactivity to keep the datastructures in sync between the database and the frontend.
Admin uses Collection2, Blaze, FlowRouter, tabular, AutoForm and Bootstrap3 as the main building blocks.

## App

The app largely utilizing meteor methods to fetch data.
App uses React, React router and Tailwind at it's core. 




