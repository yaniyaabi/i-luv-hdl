import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('rooms', { code: text('code').primaryKey(), space: integer('space').notNull() });
export const visitors = sqliteTable('visitors', { id: text('id').primaryKey(), room: text('room').notNull(), name: text('name').notNull(), drink: text('drink').notNull(), seen: integer('seen').notNull(), owner: text('owner') });
export const cafeSessions = sqliteTable('cafe_sessions', {
 id:text('id').primaryKey(),owner:text('owner').notNull(),day:text('day').notNull(),item:integer('item').notNull(),
 bean:text('bean').notNull(),task:text('task').notNull(),seconds:integer('seconds').notNull(),
 started:integer('started').notNull(),updated:integer('updated').notNull()
});
export const roomMessages = sqliteTable('room_messages', {
 id:text('id').primaryKey(),room:text('room').notNull(),kind:text('kind').notNull(),
 sender:text('sender').notNull(),senderName:text('sender_name').notNull(),senderOwner:text('sender_owner').notNull(),
 recipient:text('recipient').notNull(),recipientName:text('recipient_name').notNull(),recipientOwner:text('recipient_owner').notNull(),
 body:text('body').notNull(),created:integer('created').notNull()
});
