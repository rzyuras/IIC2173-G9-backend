const express = require('express');
const Database = require('./db'); // Asume que tienes un archivo db.js que exporta la clase Database
require('dotenv').config();
const moment = require('moment-timezone');

// Datos de conexión PostgreSQL
const pg_dbname = process.env.DATABASE_NAME;
const pg_user = process.env.DATABASE_USER;
const pg_password = process.env.DATABASE_PASSWORD;
const pg_host = 'db'; // O usa 'localhost' según tu configuración local

// Crear instancia de Database
const db = new Database(pg_dbname, pg_user, pg_password, pg_host);

// Crea una instancia de Express y la almacena en la variable app.
const app = express();
app.use(express.json()); // Middleware para parsear JSON

class FlightData {
    constructor(data) {
        this.price = data.price;
        this.currency = data.currency;
        this.carbon_emissions = data.carbon_emissions;
        this.airline_logo_url = data.airline_logo_url;
        this.departure_airport_name = data.departure_airport_name;
        this.departure_airport_id = data.departure_airport_id;
        this.departure_airport_time = data.departure_airport_time;
        this.arrival_airport_name = data.arrival_airport_name;
        this.arrival_airport_id = data.arrival_airport_id;
        this.arrival_airport_time = data.arrival_airport_time;
        this.duration = data.duration;
        this.airplane = data.airplane;
        this.airline = data.airline;
        this.airline_logo = data.airline_logo;
    }
}

app.get('/flights', async (req, res) => {
    try {
        const { page = 1, count = 25, departure, arrival, date } = req.query;
        const flights = await db.getAllFlights();
        let flightsFiltered = flights;

        const actualDatetimeUTC = moment().utc();

        if (departure && !arrival && !date) {
            flightsFiltered = flights.filter(flight => flight.departure_airport_id === departure);
        } else if (arrival && !departure && !date) {
            flightsFiltered = flights.filter(flight => flight.arrival_airport_id === arrival);
        } else if (date && !departure && !arrival) {
            flightsFiltered = flights.filter(flight => 
                moment(flight.departure_airport_time).format("YYYY-MM-DD") === date &&
                actualDatetime <= moment(flight.departure_airport_time)
            );
        } else if (departure && arrival && !date) {
            flightsFiltered = flights.filter(flight => 
                flight.departure_airport_id === departure && flight.arrival_airport_id === arrival
            );
        } else if (departure && date && !arrival) {
            flightsFiltered = flights.filter(flight => 
                flight.departure_airport_id === departure &&
                moment(flight.departure_airport_time).format("YYYY-MM-DD") === date &&
                actualDatetime <= moment(flight.departure_airport_time)
            );
        } else if (arrival && date && !departure) {
            flightsFiltered = flights.filter(flight => 
                flight.arrival_airport_id === arrival &&
                moment(flight.departure_airport_time).format("YYYY-MM-DD") === date &&
                actualDatetime <= moment(flight.departure_airport_time)
            );
        } else if (departure && arrival && date) {
            flightsFiltered = flights.filter(flight => 
                flight.departure_airport_id === departure &&
                flight.arrival_airport_id === arrival &&
                moment(flight.departure_airport_time).format("YYYY-MM-DD") === date &&
                actualDatetime <= moment(flight.departure_airport_time)
            );
        }

        const startIndex = (page - 1) * count;
        const selectedFlights = flightsFiltered.slice(startIndex, startIndex + count);

        res.json({ flights: selectedFlights });
    } catch (error) {
        res.status(500).json({ message: "Error retrieving flights", error: error.message });
    }
});


app.get('/flights/:identifier', async (req, res) => {
    try {
        const flight = await db.getFlight(req.params.identifier);
        res.json({ flight });
    } catch (error) {
        res.status(500).json({ message: "Error retrieving flight", error: error.message });
    }
});

app.post('/flights', async (req, res) => {
    try {
        const flightData = new FlightData(req.body);
        await db.insertFlight(flightData);
        res.status(201).json({ message: "Flight inserted successfully" });
    } catch (error) {
        res.status(500).json({ message: "An error occurred inserting the flight", error: error.message });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
