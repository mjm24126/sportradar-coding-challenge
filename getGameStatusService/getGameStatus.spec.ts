import {describe, expect, jest, test, beforeEach, afterEach} from '@jest/globals';
import { Client } from 'pg';
import { configureDatabase } from './setupDatabase';
import { getSchedule } from './startWatchingForLiveGames';
const axios = require("axios");

jest.mock('pg', () => {
  const mClient = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Client: jest.fn(() => mClient) };
});
jest.mock("axios");
const mAxios = axios as jest.MockedFunction<typeof axios>;

describe('required env variables configured', () => {
  test('database variables configured', () => {
    expect(process.env.PGHOST).toBe("nhl-game-stats-instance.cu9z7citjfx6.us-east-1.rds.amazonaws.com");
    expect(process.env.PGUSER).toBe("nhlgamestatsmaster");
    expect(process.env.PGDATABASE).toBe("NHLGameStats");
    expect(process.env.PGPASSWORD).toBeDefined();
    expect(process.env.PGPORT).toBe("5432");
  });

  test('lambda trigger variable configured', () => {
    expect(process.env.LAMBDA_TRIGGER_ARN).toBe("arn:aws:lambda:us-east-1:950863967482:function:nhl-stats-pipeline-dev-startIngestionStepFunction");
  });
});

describe('setup database runs necessary table, function, trigger queries', () => {
  let client;

  beforeEach(() => {
    client = new Client();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should connect to db and call db setup queries', async () => {
    client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    
    await configureDatabase(client);

    expect(client.connect).toBeCalledTimes(1);
    expect(client.query).toBeCalledTimes(6); // should expand this to validate each query in future
  });
});

describe('getSchedule', () => {
  let client;
  const testData = require('../serverlessApp/src/mocks/schedule.json');

  beforeEach(() => {
    client = new Client();
    axios.get.mockImplementation(() => Promise.resolve({ status: 200, data: testData }));
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should make axios call to get schedule data', async () => {
    client.query.mockResolvedValueOnce(testData.dates[0].games);
    
    const result = await getSchedule(client);
    expect(mAxios.get).toHaveBeenCalledTimes(1);
    expect(result.length).toEqual(testData.dates[0].games.length)
    expect(client.query).toBeCalledTimes(1); // should expand this to validate each query in future
  });
});