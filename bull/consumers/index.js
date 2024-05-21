const { Worker } = require('bullmq');
const axios = require('axios');

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
};

const worker = new Worker('flightsRecommendation', async (job) => {
  const { userId, latitudeIp, longitudeIp, lastFlight } = job.data;
  const sameDepartureFlightsUrl = `http://app:3000/flights?departure=${lastFlight.arrival_airport_id}`;
  
  try {
    const response = await axios.get(sameDepartureFlightsUrl);
    const sameDepartureFlights = response.data;
    
    const lastFlights = sameDepartureFlights.filter(
      (flight) => {
        const lastArrivalTime = new Date(lastFlight.arrival_airport_time);
        const flightDepartureTime = new Date(flight.departure_airport_time);
        const timeDiffInDays = Math.abs(lastArrivalTime - flightDepartureTime) / (1000 * 60 * 60 * 24);

        return lastArrivalTime < flightDepartureTime && timeDiffInDays <= 7;
      }).slice(0,20);
    return lastFlights;
  } catch (error) {
    console.error(`Error while fetching flights: ${error}`);
    throw error;
  }
}, { connection });

console.log("Worker is listening for jobs...");
