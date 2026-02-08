-- Phase 1: Database schema for Executive Advisory Team architecture
-- Adds support for:
-- - Model domain expertise persistence (leaderboard)
-- - Goki roster management (role assignments)
-- - Debate sessions and rounds tracking

-- Model domain expertise (leaderboard persistence)
CREATE TABLE `model_domain_expertise` (
  `id` text PRIMARY KEY NOT NULL,
  `model_id` text NOT NULL,
  `category` text NOT NULL,
  `scores` text NOT NULL,
  `total_wins` integer NOT NULL DEFAULT 0,
  `total_evaluations` integer NOT NULL DEFAULT 0,
  `avg_score` real NOT NULL DEFAULT 0,
  `win_rate` real NOT NULL DEFAULT 0,
  `last_evaluated_at` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  UNIQUE(model_id, category)
);

CREATE INDEX `idx_model_domain_category` ON `model_domain_expertise`(`category`);
CREATE INDEX `idx_model_domain_score` ON `model_domain_expertise`(`category`, `avg_score` DESC);

-- Goki roster (role assignments)
CREATE TABLE `goki_roster` (
  `id` text PRIMARY KEY NOT NULL,
  `role` text NOT NULL UNIQUE,
  `model_id` text NOT NULL,
  `assignment_type` text NOT NULL,
  `assigned_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE INDEX `idx_roster_role` ON `goki_roster`(`role`);

-- Debate sessions
CREATE TABLE `debate_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `conversation_id` text NOT NULL,
  `user_message_id` text NOT NULL,
  `status` text NOT NULL,
  `total_rounds` integer NOT NULL DEFAULT 0,
  `max_rounds` integer NOT NULL DEFAULT 5,
  `consensus_threshold` real NOT NULL DEFAULT 0.8,
  `final_recommendation` text,
  `created_at` text NOT NULL,
  `completed_at` text,
  FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`user_message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX `idx_debate_conversation` ON `debate_sessions`(`conversation_id`);
CREATE INDEX `idx_debate_status` ON `debate_sessions`(`status`);

-- Debate rounds
CREATE TABLE `debate_rounds` (
  `id` text PRIMARY KEY NOT NULL,
  `debate_session_id` text NOT NULL,
  `round_number` integer NOT NULL,
  `goki_role` text NOT NULL,
  `model_id` text NOT NULL,
  `message_id` text NOT NULL,
  `consensus_score` real,
  `created_at` text NOT NULL,
  FOREIGN KEY (`debate_session_id`) REFERENCES `debate_sessions`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX `idx_debate_round_session` ON `debate_rounds`(`debate_session_id`, `round_number`);
