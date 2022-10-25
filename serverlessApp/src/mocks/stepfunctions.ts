export const awsSdkPromiseResponse = jest.fn().mockReturnValue(Promise.resolve({
  executionArn: 'arn:aws:states:us-east-1:950863967482:execution:GameStatIngesterStateMachine-kz2GvDztBOMt:4defc4a3-b05a-4857-bd92-5020eabf9f32',
  startDate: '2022-10-25T10:03:42.906Z'
}));

const params: StartExecutionInput = {
  stateMachineArn: process.env.STATE_MACHINE_ARN as string,
  input: `{\"GameId\" : \"123234343\"}`
};

const startExecutionFn = jest.fn().mockImplementation((params) => ({ promise: awsSdkPromiseResponse }));

export class StepFunctions {
  startExecution = startExecutionFn;
}

export interface StartExecutionInput {
  stateMachineArn: string;
  input: string;
}