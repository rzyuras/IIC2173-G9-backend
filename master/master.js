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

async function produceRecommendation(userId, latitudeIp, longitudeIp, lastFlight) {
  await flightsQueue.add('recommendation', {
    userId, latitudeIp, longitudeIp, lastFlight,
  });
  console.log(`Added recommendation job for user IP ${userId}`);
}

app.post('/job', async (req, res) => {
  try {
    const job = await queue.add('flightTask', req.body);
    res.status(201).send({ jobId: job.id });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Endpoint para obtener el estado de un job
app.get('/job/:id', async (req, res) => {
  try {
    const job = await queue.getJob(req.params.id);
    if (job) {
      const state = await job.getState();
      const progress = await job.progress();
      res.send({ id: job.id, state, progress });
    } else {
      res.status(404).send({ error: 'Job not found' });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Endpoint para verificar si el servicio está operativo
app.get('/heartbeat', (req, res) => {
  res.send({ status: 'running' });
});

app.listen(port, () => {
  console.log(`Master API running on port ${port}`);
});

module.exports = { produceRecommendation };
