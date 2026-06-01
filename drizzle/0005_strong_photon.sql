-- SQLite restricts ALTER TABLE ADD COLUMN defaults to constants. We add the
-- column with default 0, then backfill existing rows in a follow-up UPDATE so
-- pre-existing rows aren't all stuck at epoch zero.
ALTER TABLE `categories` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `entries` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shopping_items` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `categories` SET `updated_at` = unixepoch() * 1000;--> statement-breakpoint
UPDATE `entries` SET `updated_at` = unixepoch() * 1000;--> statement-breakpoint
UPDATE `shopping_items` SET `updated_at` = unixepoch() * 1000;
