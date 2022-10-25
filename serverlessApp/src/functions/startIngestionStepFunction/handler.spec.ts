import {describe, expect, test, jest, beforeEach, afterEach} from '@jest/globals';
import { handler } from './handler';
import { StepFunctions, StartExecutionInput, awsSdkPromiseResponse } from '../../mocks/stepfunctions';



jest.mock("../../mocks/stepfunctions");
describe('startIngestionStepFunction calls startExecution', () => {
  const event = { "GameId": "2022020094" };
  
  process.env.STATE_MACHINE_ARN = "arn:aws:states:us-east-1:950863967482:stateMachine:GameStatIngesterStateMachine-kz2GvDztBOMt";
  beforeEach(() => {
    
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test.skip('should call startExecution', async () => {
    const stepFunctions = new StepFunctions();
    
    const params: StartExecutionInput = {
      stateMachineArn: process.env.STATE_MACHINE_ARN as string,
      input: `{\"GameId\" : \"${event.GameId}\"}`
    };
    stepFunctions.startExecution = jest.fn().mockImplementation((params) => ({ promise: awsSdkPromiseResponse }));
    console.log(stepFunctions.startExecution);

    const result = await handler(event);
    
    expect(stepFunctions.startExecution).toBeCalled();
  });

});