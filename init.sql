CREATE TABLE IF NOT EXISTS flights (
      id SERIAL PRIMARY KEY,
      departure_airport_name VARCHAR(255),
      departure_airport_id VARCHAR(255),
      departure_airport_time TIMESTAMPTZ,
      arrival_airport_name VARCHAR(255),
      arrival_airport_id VARCHAR(255),
      arrival_airport_time TIMESTAMPTZ,
      duration NUMERIC,
      airplane VARCHAR(255),
      airline VARCHAR(255),
      airline_logo VARCHAR(255),
      carbon_emissions NUMERIC,
      price NUMERIC,
      currency CHAR(3),
      airline_logo_url VARCHAR(255),
      flight_tickets INT DEFAULT 90
    );

CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      flight_id INT,
      user_id VARCHAR(255),
      purchase_status VARCHAR(255) CHECK (purchase_status IN ('pending', 'approved', 'rejected')),
      quantity INT,
      uuid VARCHAR(255),
      FOREIGN KEY (flight_id) REFERENCES flights(id)
    );