-- flights table
CREATE TABLE IF NOT EXISTS flights (
      id SERIAL PRIMARY KEY,
      departure_airport_name VARCHAR(255) NOT NULL,
      departure_airport_id VARCHAR(255) NOT NULL,
      departure_airport_time TIMESTAMPTZ NOT NULL,
      arrival_airport_name VARCHAR(255) NOT NULL,
      arrival_airport_id VARCHAR(255) NOT NULL,
      arrival_airport_time TIMESTAMPTZ NOT NULL,
      duration NUMERIC,
      airplane VARCHAR(255),
      airline VARCHAR(255),
      airline_logo VARCHAR(255),
      carbon_emissions NUMERIC,
      price NUMERIC,
      currency CHAR(3),
      airline_logo_url VARCHAR(255),
      flight_tickets INT DEFAULT 90,
      group_tickets INT DEFAULT 0
    );

-- purchase table
CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255),
      flight_id INT NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      purchase_status VARCHAR(255) CHECK (purchase_status IN ('pending', 'approved', 'rejected')) NOT NULL,
      quantity INT NOT NULL,
      latitude_ip NUMERIC,
      longitude_ip NUMERIC,
      uuid VARCHAR(255) NOT NULL,
      receipt_url VARCHAR(255),
      purchase_type VARCHAR(20) CHECK (purchase_type IN ('standard', 'group')) NOT NULL,
      action_type VARCHAR(20) CHECK (action_type IN ('seller9', 'seller0')) NOT NULL,
      FOREIGN KEY (flight_id) REFERENCES flights(id)
    );

-- recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
      user_id VARCHAR(255) PRIMARY KEY,
      flight1 INT,
      flight2 INT,
      flight3 INT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (flight1) REFERENCES flights(id),
      FOREIGN KEY (flight2) REFERENCES flights(id),
      FOREIGN KEY (flight3) REFERENCES flights(id)
    );

-- auctions table
CREATE TABLE IF NOT EXISTS auctions (
    auction_id VARCHAR(255) PRIMARY KEY,
    proposal_id VARCHAR(255),
    flight_id INT REFERENCES flights(id),
    quantity INT,
    group_id INT,
    type VARCHAR(255)
);

-- proposals table
CREATE TABLE IF NOT EXISTS proposals (
    auction_id VARCHAR(255),
    proposal_id VARCHAR(255) PRIMARY KEY,
    departure_airport VARCHAR(255),
    arrival_airport VARCHAR(255),
    departure_time TIMESTAMPTZ,
    airline VARCHAR(255),
    quantity INT,
    group_id INT,
    type VARCHAR(255)
);

-- responses table
CREATE TABLE IF NOT EXISTS responses (
    auction_id VARCHAR(255),
    proposal_id VARCHAR(255),
    departure_airport VARCHAR(255),
    arrival_airport VARCHAR(255),
    departure_time TIMESTAMPTZ,
    airline VARCHAR(255),
    quantity INT,
    group_id INT,
    type VARCHAR(255)
);


-- trigger function
CREATE OR REPLACE FUNCTION function_approved()
RETURNS trigger AS $$
DECLARE
  payload TEXT;
BEGIN
  payload := json_build_object(
    'user_id', NEW.user_id,
    'flight_id', NEW.flight_id,
    'latitude_ip', NEW.latitude_ip,
    'longitude_ip', NEW.longitude_ip
  )::text;

  PERFORM pg_notify('table_update', payload);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- trigger
CREATE TRIGGER purchase_approved
AFTER UPDATE OF purchase_status
ON purchases
FOR EACH ROW
WHEN (NEW.purchase_status = 'approved')
EXECUTE FUNCTION function_approved();

