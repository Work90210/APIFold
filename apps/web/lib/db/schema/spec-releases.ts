import { pgTable, uuid, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { mcpServers } from './servers';
import { specVersions } from './spec-versions';

export const specReleases = pgTable(
  'spec_releases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serverId: uuid('server_id')
      .references(() => mcpServers.id, { onDelete: 'cascade' })
      .notNull(),
    environment: text('environment').default('production').notNull(),
    versionId: uuid('version_id')
      .references(() => specVersions.id)
      .notNull(),
    endpointUrl: text('endpoint_url'),
    promotedAt: timestamp('promoted_at', { withTimezone: true }).defaultNow().notNull(),
    promotedBy: text('promoted_by').notNull(),
  },
  (table) => ({
    serverIdIdx: index('idx_spec_releases_server_id').on(table.serverId),
    versionIdIdx: index('idx_spec_releases_version_id').on(table.versionId),
    serverEnvUnique: unique('spec_releases_server_id_environment_unique').on(
      table.serverId,
      table.environment,
    ),
  }),
);
