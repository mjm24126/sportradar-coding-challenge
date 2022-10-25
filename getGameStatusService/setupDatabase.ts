export async function configureDatabase(client) {
  try {
    
    await client.connect()

    // Set up table to hold game statuses
    await client.query(`
        CREATE TABLE IF NOT EXISTS games (
          gamePk INTEGER NOT NULL PRIMARY KEY,
          statusCode INTEGER NOT NULL,
          lastUpdated TIMESTAMP
        )
      `);
    
    // Set up table to hold player stats for games
    // Includes player name, team, number, position, age, hits, goals, assists, penaltyMinutes, and points
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_stats (
        statID BIGINT NOT NULL PRIMARY KEY,
        gamePk INTEGER NOT NULL,
        playerId TEXT NOT NULL,
        playerName TEXT,
        teamId INTEGER,
        teamName TEXT,
        age INTEGER,
        playerNumber TEXT,
        playerPosition TEXT,
        assists INTEGER,
        goals INTEGER,
        hits INTEGER,
        points INTEGER,
        penaltyMinutes INTEGER,
        lastUpdated TIMESTAMP
      )
    `);

    // Add extension for invoking lambdas from postgres
    await client.query(`CREATE EXTENSION IF NOT EXISTS aws_lambda CASCADE;`);

    // Create function to invoke startIngestionStepFunction lambda with game id
    await client.query(`
      CREATE OR REPLACE FUNCTION start_stats_ingestion() RETURNS TRIGGER AS $$
        declare
          v_invoke_command text;
          v_status_code numeric(10);
        begin
        
          v_invoke_command := 'SELECT status_code FROM aws_lambda.invoke(aws_commons.create_lambda_function_arn(''${process.env.LAMBDA_TRIGGER_ARN}''),'
                        ||'''{"GameId": "' || NEW.gamepk || '" }''::json)';
      
          execute v_invoke_command into v_status_code;
        RETURN NEW;
      
        exception
        when others then
          raise notice '% %', SQLERRM, SQLSTATE;
          raise notice '% %', SQLERRM, SQLSTATE;
        RETURN NULL;
        END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Setup trigger function for row updates to games table
    // When a game is updated to have a status of 3, we will call the function above to start the ingestion step function
    // Note: both statuses 3 and 4 are Live game codes but for the purposes of this exercise, I am making the assumption that
    //       a game will enter status 3 (Live / In Progress) before it enters status 4 (Live / In Progress - Critical)
    await client.query(`DROP TRIGGER IF EXISTS trigger_update_game_status on games;`);
    await client.query(`
      CREATE TRIGGER trigger_update_game_status
      AFTER UPDATE ON games
      FOR EACH ROW
      WHEN (OLD.statuscode IS DISTINCT FROM NEW.statuscode AND NEW.statuscode = 3 ) 
      EXECUTE FUNCTION start_stats_ingestion();
    `);
    console.log('Successfully configured database');
  } catch(e) {
    console.log('Error configuring database');
    console.log(e);
  }
}