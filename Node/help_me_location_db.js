const { MongoClient } = require("mongodb");

const LOCATION_MONGO_URI =
  process.env.LOCATION_MONGO_URI || "mongodb://localhost:27017";
const LOCATION_DB_NAME = process.env.LOCATION_DB_NAME || "HelpMeLocation";

let clientPromise = null;

async function getLocationDb() {
  if (!clientPromise) {
    const client = new MongoClient(LOCATION_MONGO_URI);
    clientPromise = client.connect();
  }

  const client = await clientPromise;
  return client.db(LOCATION_DB_NAME);
}

module.exports = {
  getLocationDb,
  LOCATION_DB_NAME,
};
