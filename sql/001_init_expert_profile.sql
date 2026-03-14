CREATE DATABASE IF NOT EXISTS expertmatch;
USE expertmatch;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(140) NOT NULL,
  email VARCHAR(160) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS experts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  full_name VARCHAR(140) NOT NULL,
  title VARCHAR(180) NOT NULL,
  headline VARCHAR(255) NOT NULL,
  category VARCHAR(80) NOT NULL,
  experience_years INT NOT NULL,
  rating DECIMAL(2,1) NOT NULL DEFAULT 0.0,
  review_count INT NOT NULL DEFAULT 0,
  consultations INT NOT NULL DEFAULT 0,
  success_rate INT NOT NULL DEFAULT 0,
  avg_response_minutes INT NOT NULL DEFAULT 0,
  solved_doubts INT NOT NULL DEFAULT 0,
  price_per_minute DECIMAL(8,2) NOT NULL,
  availability_status VARCHAR(20) NOT NULL DEFAULT 'offline',
  is_online TINYINT(1) NOT NULL DEFAULT 0,
  profile_image_url TEXT,
  about TEXT,
  education VARCHAR(255),
  languages VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expert_specialties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  expert_id INT NOT NULL,
  specialty VARCHAR(120) NOT NULL,
  UNIQUE KEY uk_expert_specialty (expert_id, specialty),
  FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expert_perks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  expert_id INT NOT NULL,
  perk VARCHAR(140) NOT NULL,
  UNIQUE KEY uk_expert_perk (expert_id, perk),
  FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE
);

INSERT INTO users (id, full_name, email)
VALUES (1, 'Elena Rodriguez', 'elena@example.com')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

INSERT INTO experts (
  user_id, slug, full_name, title, headline, category, experience_years, rating,
  review_count, consultations, success_rate, avg_response_minutes,
  solved_doubts, price_per_minute, availability_status, is_online, profile_image_url, about,
  education, languages
)
VALUES
(
  1,
  'elena-rodriguez',
  'Dr. Elena Rodriguez',
  'Senior Research Scientist & Educator',
  'Bridging theoretical physics and practical engineering.',
  'Physics',
  12,
  4.8,
  1240,
  3500,
  98,
  5,
  2400,
  2.50,
  'available',
  1,
  'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
  'With over 12 years of experience in academia and industry, I specialize in helping students and professionals convert complex concepts into practical solutions.',
  'PhD in Theoretical Physics, MIT',
  'English,Spanish,German'
)
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), availability_status = VALUES(availability_status);

INSERT IGNORE INTO expert_specialties (expert_id, specialty)
SELECT id, 'Quantum Mechanics' FROM experts WHERE slug = 'elena-rodriguez'
UNION ALL
SELECT id, 'Mathematics' FROM experts WHERE slug = 'elena-rodriguez'
UNION ALL
SELECT id, 'Physics' FROM experts WHERE slug = 'elena-rodriguez';

INSERT IGNORE INTO expert_perks (expert_id, perk)
SELECT id, 'Verified Expert Identity' FROM experts WHERE slug = 'elena-rodriguez'
UNION ALL
SELECT id, 'Encrypted Video & Chat' FROM experts WHERE slug = 'elena-rodriguez'
UNION ALL
SELECT id, 'Downloadable Session Notes' FROM experts WHERE slug = 'elena-rodriguez';
