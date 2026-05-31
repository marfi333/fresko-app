CREATE TABLE `barcode_lookups` (
	`barcode` text PRIMARY KEY NOT NULL,
	`source` text,
	`name` text,
	`brands` text,
	`categories_tags` text,
	`quantity` text,
	`raw_response` text,
	`not_found` integer DEFAULT false NOT NULL,
	`fetched_at` integer NOT NULL
);
