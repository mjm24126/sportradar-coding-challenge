export default {
  type: "object",
  properties: {
    gameId: { type: 'string' }
  },
  required: ['gameId']
} as const;
