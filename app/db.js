const { Client } = require('pg');

class Database {
    constructor(dbname, user, password, host) {
        this.client = new Client({
            user: user,
            host: host,
            database: dbname,
            password: password
        });
    }

    async connect() {
        await this.client.connect();
    }

    async getAllFlights() {
        const query = `
            SELECT * FROM flights
        `;
        const result = await this.client.query(query);
        return result.rows;
    }

    async getFlight(identifier) {
        const query = `
            SELECT * FROM flights WHERE id = $1
        `;
        const result = await this.client.query(query, [identifier]);
        return result.rows[0];
    }

    async insertFlight(data) {
        const insertQuery = `
            INSERT INTO flights 
            (departure_airport_name, departure_airport_id, departure_airport_time, 
            arrival_airport_name, arrival_airport_id, arrival_airport_time, 
            duration, airplane, airline, airline_logo, 
            carbon_emissions, price, currency, airline_logo_url) 
            VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `;
        const values = [
            data.departure_airport_name, data.departure_airport_id, data.departure_airport_time,
            data.arrival_airport_name, data.arrival_airport_id, data.arrival_airport_time,
            data.duration, data.airplane, data.airline, data.airline_logo,
            data.carbon_emissions, data.price, data.currency, data.airline_logo_url
        ];
        await this.client.query(insertQuery, values);
    }

    async close() {
        await this.client.end();
    }
}

module.exports = Database;

