const { Queue } = require('bullmq');

const flightsQueue = new Queue('flights recommendation', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
});
// Aquí iría la lógica para generar las recomendaciones
  // 1. Obtener la ubicación del usuario desde su IP.
  // 2. Obtener la información del último vuelo comprado.
  // 3. Obtener los últimos 20 vuelos desde el aeropuerto de destino del último vuelo.
  // 4. Calcular la distancia y ordenar según el precio y distancia.
  // 5. Obtener las 3 mejores recomendaciones.

async function produceRecommendation(userId, latitudeIp, longitudeIp, lastFlight) {
  await flightsQueue.add('flights recommendation', {
    userId, latitudeIp, longitudeIp, lastFlight,
  });
  console.log(`Added recommendation job for user IP ${userId}`);
}

module.exports = { produceRecommendation };
