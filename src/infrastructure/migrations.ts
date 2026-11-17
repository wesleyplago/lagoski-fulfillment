import type { Migration } from '../chassis/db.js';

export const migrations: Migration[] = [
  {
    id: '001_shipments',
    sql: `
      create table shipments (
        id text primary key,
        order_id text not null unique,
        customer_id text not null,
        lines jsonb not null,
        status text not null,
        tracking_code text,
        carrier text not null,
        updated_at timestamptz not null
      );
      create index shipments_in_transit on shipments (updated_at) where status <> 'DELIVERED';
    `,
  },
];
