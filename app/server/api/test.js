import { WebApp } from "meteor/webapp";
import bodyParser from "body-parser";
import { Members } from "/imports/common/collections/members";
import { Memberships } from "/imports/common/collections/memberships";
import { memberStatus } from '/imports/common/lib/utils';

WebApp.handlers.use(bodyParser.json());
WebApp.handlers.use("/api/test", async (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({hepp: 'hopp'}));
});

