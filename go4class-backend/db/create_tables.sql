/* =========================
   ROLES
   ========================= */
CREATE TABLE IF NOT EXISTS roles (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (name)
VALUES
    ('Player'),
    ('Participant'),
    ('Coach'),
    ('School'),
    ('Club')
ON CONFLICT (name) DO NOTHING;


/* =========================
   USERS
   ========================= */
CREATE TABLE IF NOT EXISTS users (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    role_id INT NOT NULL REFERENCES roles(id) ON UPDATE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    last_updated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


/* =========================
   BILLING INFO
   ========================= */
CREATE TABLE IF NOT EXISTS billing_info (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    abn_number CHAR(11) NOT NULL,
    business_name VARCHAR(150) NOT NULL,
    bank_name VARCHAR(50) NOT NULL,
    bsb CHAR(6) NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    last_updated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


/* =========================
   EVENTS
   ========================= */
CREATE TABLE IF NOT EXISTS events (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    sport VARCHAR(50),
    format VARCHAR(50),
    level VARCHAR(50),
    timezone VARCHAR(50) NOT NULL,
    location_name VARCHAR(150),
    address VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    registration_deadline DATE,
    capacity INT,
    entry_fee NUMERIC(10,2),
    currency CHAR(3) DEFAULT 'AUD',
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    allow_waitlist BOOLEAN DEFAULT FALSE,
    require_approval BOOLEAN DEFAULT FALSE,
    last_updated_by VARCHAR(150),
    last_updated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


/* =========================
   ENUM TYPES (PostgreSQL-safe)
   ========================= */
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'class_day') THEN
        CREATE TYPE class_day AS ENUM (
            'Monday', 'Tuesday', 'Wednesday',
            'Thursday', 'Friday', 'Saturday', 'Sunday'
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'class_status') THEN
        CREATE TYPE class_status AS ENUM ('Active', 'Cancelled');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'class_level') THEN
        CREATE TYPE class_level AS ENUM ('Beginner', 'Intermediate', 'Advanced');
    END IF;
END $$;


/* =========================
   CLASSES
   ========================= */
CREATE TABLE IF NOT EXISTS classes (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    coach VARCHAR(150) NOT NULL,
    day class_day NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    level class_level NOT NULL,
    students INT DEFAULT 0,
    capacity INT NOT NULL,
    status class_status NOT NULL DEFAULT 'Active',
    location VARCHAR(255),
    last_updated_by VARCHAR(150),
    last_updated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
