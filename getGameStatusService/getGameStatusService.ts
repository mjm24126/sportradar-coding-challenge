
const dotenv = require('dotenv');
const { Client } = require('pg')
import { configureDatabase } from './setupDatabase';
import { startWatchingForGameStatus } from './startWatchingForLiveGames';
dotenv.config();

let client = new Client();

try {
  configureDatabase(client);
  startWatchingForGameStatus(client);
} catch(err) {
  client.end();
  console.error(err);
  process.exit(1);
};

