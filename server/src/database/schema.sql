-- ==============================================================
-- Website Maintenance & Upgrade Reporting Tool - MySQL Schema
-- Host: Cloudways MySQL / MariaDB
-- ==============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table (Authentication & Access Control)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Reports Table (Saved Technical Maintenance Reports)
CREATE TABLE IF NOT EXISTS `reports` (
  `id` VARCHAR(64) NOT NULL,
  `website_url` VARCHAR(512) NOT NULL,
  `website_name` VARCHAR(255) NOT NULL,
  `client_name` VARCHAR(255) DEFAULT NULL,
  `report_date` VARCHAR(20) NOT NULL,
  `prepared_by` VARCHAR(255) DEFAULT NULL,
  `total_tasks` INT NOT NULL DEFAULT 0,
  `completed_tasks` INT NOT NULL DEFAULT 0,
  `incomplete_tasks` INT NOT NULL DEFAULT 0,
  `completion_percentage` INT NOT NULL DEFAULT 0,
  `tasks_json` LONGTEXT NOT NULL,
  `wordpress_users_json` LONGTEXT NOT NULL,
  `executive_summary` TEXT DEFAULT NULL,
  `final_summary` TEXT DEFAULT NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `updated_at` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_reports_url` (`website_url`(191)),
  INDEX `idx_reports_created` (`created_at`),
  INDEX `idx_reports_updated` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
