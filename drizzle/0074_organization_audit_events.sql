CREATE TABLE organizationAuditEvents (
  id int AUTO_INCREMENT NOT NULL,
  organizationId int NOT NULL,
  actorUserId int NOT NULL,
  category varchar(80) NOT NULL,
  subject varchar(160) NOT NULL,
  details text NOT NULL,
  traceId varchar(128),
  createdAt timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT organizationAuditEvents_id PRIMARY KEY(id)
);
--> statement-breakpoint
CREATE INDEX organization_audit_org_created_idx ON organizationAuditEvents (organizationId, createdAt);
--> statement-breakpoint
CREATE INDEX organization_audit_actor_idx ON organizationAuditEvents (actorUserId, createdAt);
