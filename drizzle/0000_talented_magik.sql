CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`category_id` integer,
	`household_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` real NOT NULL,
	`compartment` text NOT NULL,
	`expiry_date` integer,
	`created_by` text NOT NULL,
	`household_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`household_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usage_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer,
	`product_id` integer NOT NULL,
	`quantity_delta` real NOT NULL,
	`reason` text NOT NULL,
	`user_id` text NOT NULL,
	`household_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `product_hints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name_pattern` text NOT NULL,
	`suggested_unit` text NOT NULL,
	`suggested_category` text NOT NULL
);
