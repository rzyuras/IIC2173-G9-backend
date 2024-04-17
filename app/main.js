const express = require('express');
const { Client } = require('pg');

const app = express();
const port = 3000;

// Create a new PostgreSQL client instance
const client = new Client({
    user: 'your_username',
    host: 'your_host',
    database: 'your_database',
    password: 'your_password',
    port: 5432, // Default PostgreSQL port
});

// Connect to the PostgreSQL database
client.connect()
    .then(() => {
        console.log('Connected to the database');
        createFlightsTable(); // Call the function to create the table
    })
    .catch(err => console.error('Error connecting to the database', err));

// Function to create the flights table
function createFlightsTable() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS flights (
            id SERIAL PRIMARY KEY,
            departure_airport_name VARCHAR(255),
            departure_airport_id VARCHAR(255),
            departure_airport_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            arrival_airport_name VARCHAR(255),
            arrival_airport_id VARCHAR(255),
            arrival_airport_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            duration NUMERIC,
            airplane VARCHAR(255),
            airline VARCHAR(255),
            airline_logo VARCHAR(255),
            carbon_emissions NUMERIC,
            price NUMERIC,
            currency CHAR(3),
            airline_logo_url VARCHAR(255)
        )
    `;

    // Execute the SQL query to create the table
    client.query(createTableQuery)
        .then(() => console.log('Flights table created successfully'))
        .catch(err => console.error('Error creating flights table', err));
}

// Define your application routes below
app.get('/', (req, res) => {
    res.send('Hello, World!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
