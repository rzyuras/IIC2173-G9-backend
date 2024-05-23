const { Client } = require('pg');

class Database {
  constructor(dbname, user, password, host) {
    this.client = new Client({
      user,
      host,
      database: dbname,
      password,
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

  async getFlightBydata(departure, arrival, departureTime) {
    const query = `
            SELECT * FROM flights WHERE departure_airport_id = $1 AND arrival_airport_id = $2 AND departure_airport_time = $3
        `;
    const result = await this.client.query(query, [
      departure,
      arrival,
      departureTime,
    ]);
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
      data.departure_airport_name,
      data.departure_airport_id,
      data.departure_airport_time,
      data.arrival_airport_name,
      data.arrival_airport_id,
      data.arrival_airport_time,
      data.duration,
      data.airplane,
      data.airline,
      data.airline_logo,
      data.carbon_emissions,
      data.price,
      data.currency,
      data.airline_logo_url,
    ];
    await this.client.query(insertQuery, values);
  }

  async updateFlight(quantity, flightId) {
    const updateQuery = `
            UPDATE flights
            SET flight_tickets = flight_tickets - $1
            WHERE id = $2
        `;
    const values = [quantity, flightId];
    await this.client.query(updateQuery, values);
  }

  async getPurchaseByUuid(requestId) {
    const query = `
            SELECT * FROM purchases WHERE uuid = $1
        `;
    const result = await this.client.query(query, [requestId]);
    return result.rows[0];
  }

  async getPurchaseById(id) {
    const query = `
            SELECT * FROM purchases WHERE id = $1
        `;
    const result = await this.client.query(query, [id]);
    return result.rows[0];
  }

  async getMyPurchases(userId) {
    const query = `
            SELECT * FROM purchases WHERE user_id = $1
        `;
    const result = await this.client.query(query, [userId]);
    return result.rows;
  }

  async insertPurchase(data) {
    const insertQuery = `
            INSERT INTO purchases 
            (flight_id, user_id, purchase_status, quantity, uuid, username) 
            VALUES 
            ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
    const values = [
      data.flight_id,
      data.user_id,
      data.purchase_status,
      data.quantity,
      data.uuid,
      data.username,
    ];
    const result = await this.client.query(insertQuery, values);
    return result.rows[0];
  }

  async updatePurchaseStatus(requestId, purchaseStatus) {
    const updateQuery = `
        UPDATE purchases
        SET purchase_status = $1
        WHERE uuid = $2
        RETURNING quantity, flight_id;
    `;
    const result = await this.client.query(updateQuery, [
      purchaseStatus,
      requestId,
    ]);
    if (result.rows.length > 0) {
      return result.rows[0]; // Devuelve la fila actualizada
    }
    return null; // O manejar según corresponda cuando no hay filas actualizadas
  }


  async updatePurchaseDir(requestId, latitudeIp, longitudeIp) {
    const updateQuery = `
        UPDATE purchases
        SET latitudeIp = $1,
            longitudeIp = $2
        WHERE uuid = $3;
    `;
    await this.client.query(updateQuery, [
      latitudeIp,
      longitudeIp,
      requestId,
    ]);
  }

  async updateReceiptUrl(uuid, url) {
    const updateQuery = `
        UPDATE purchases
        SET receipt_url = $1
        WHERE uuid = $2;
    `;
    await this.client.query(updateQuery, [url, uuid]);
  }
  
  async createRecommendation(userId) {
    const insertQuery = `
            INSERT INTO recommendations 
            (user_id, createdAt, updatedAt) 
            VALUES 
            ($1, $2, $2)
            ON CONFLICT (user_id) DO NOTHING
        `;
    const values = [userId, new Date()];
    await this.client.query(insertQuery, values);
  }

  async updateRecommendation(user_id, flight1, flight2, flight3) {
    const updateQuery = `
            UPDATE recommendations
            SET flight1 = $2, flight2 = $3, flight3 = $4, updatedAt = $5
            WHERE user_id = $1
        `;
    const values = [user_id, flight1, flight2, flight3, new Date()];
    await this.client.query(updateQuery, values);
  }

  async getRecommendation(userId) {
    const query = `
            SELECT * FROM recommendations WHERE user_id = $1
        `;
    const result = await this.client.query(query, [userId]);
    return result.rows[0];
  }

  async close() {
    await this.client.end();
  }
}

module.exports = Database;
