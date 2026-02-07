CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`message_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cost_records` (
	`id` text PRIMARY KEY NOT NULL,
	`model_id` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`cost_usd` real NOT NULL,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`model_id` text NOT NULL,
	`judge_model_id` text NOT NULL,
	`overall_score` real NOT NULL,
	`criteria` text NOT NULL,
	`rank` integer NOT NULL,
	`total_competitors` integer NOT NULL,
	`response_time_ms` real NOT NULL,
	`token_cost` real NOT NULL,
	`strength_summary` text,
	`weakness_summary` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memory_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`parent_category_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`content` text NOT NULL,
	`embedding` text,
	`importance` real DEFAULT 0.5 NOT NULL,
	`access_count` integer DEFAULT 0 NOT NULL,
	`last_accessed_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `memory_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `memory_resources` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`resource_type` text NOT NULL,
	`source_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `memory_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`model_id` text,
	`content` text NOT NULL,
	`mentions` text DEFAULT '[]' NOT NULL,
	`parent_message_id` text,
	`evaluation_score` real,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `model_performance` (
	`id` text PRIMARY KEY NOT NULL,
	`model_id` text NOT NULL,
	`category` text NOT NULL,
	`average_score` real NOT NULL,
	`total_evaluations` integer NOT NULL,
	`win_rate` real NOT NULL,
	`avg_response_time_ms` real NOT NULL,
	`avg_token_cost` real NOT NULL,
	`trend` text DEFAULT 'stable' NOT NULL,
	`last_evaluated_at` text NOT NULL
);
