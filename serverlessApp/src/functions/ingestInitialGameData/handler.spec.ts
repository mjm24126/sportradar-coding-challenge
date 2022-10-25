import {describe, expect, test, jest, beforeEach, afterEach} from '@jest/globals';
import { ingestInitialGameData } from './handler';
import { Client } from 'pg';
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

describe('required env variables configured', () => {
  test('database variables configured', () => {
    expect(process.env.PGHOST).toBe("nhl-game-stats-instance.cu9z7citjfx6.us-east-1.rds.amazonaws.com");
    expect(process.env.PGUSER).toBe("nhlgamestatsmaster");
    expect(process.env.PGDATABASE).toBe("NHLGameStats");
    expect(process.env.PGPASSWORD).toBeDefined();
    expect(process.env.PGPORT).toBe("5432");
  });
});

describe('ingestInitialGameData calls expected db methods', () => {
  let client;
  const testData = require('../../mocks/liveGameResponse.json');
  const event = { "GameId": "2022020094" };

  beforeEach(() => {
    client = new Client();
    axios.get.mockImplementation(() => Promise.resolve({ status: 200, data: testData }));
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should call update for each row  on success', async () => {
    const result = await ingestInitialGameData(event);
    expect(client.connect).toBeCalledTimes(1);
    // add to this test to check actual queries executed are correct
    // expect(client.query).toBeCalledWith('UPDATE public.gameStats');  
    expect(client.query).toBeCalledTimes(Object.keys(testData.gameData.players).length);
    expect(client.end).toBeCalledTimes(1);
    expect(result).toEqual({"GameId": "2022020094", "event": {"GameId": "2022020094"}, "gameState": "4", "message": "ingesting initial 2022020094 stats"});
  });

  test('should return error on failure', async () => {
    const mError = new Error('dead lock');
    client.query.mockRejectedValueOnce(mError);
    const result = await ingestInitialGameData(event);
    expect(client.connect).toBeCalledTimes(1);
    expect(client.query).toBeCalledTimes(1);
    // add to this test to check actual queries executed are correct
    // expect(client.query).toBeCalledWith('SELECT * FROM game_stats WHERE gamepk = 2022020094');
    expect(client.end).toBeCalledTimes(1);
    expect(result).toEqual({
      "GameId": "2022020094",
      "error": mError,
      "event": {
        "GameId": "2022020094",
      },
      "gameState": "4",
      "message": "error ingesting initial 2022020094 stats",
    });
  });
});