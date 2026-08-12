import serverlessExpress from '@vendia/serverless-express';
import app from './src/app.js';

/**
 * AWS Lambda Serverless Entrypoint for MedAI
 * 
 * Proxies AWS API Gateway events (REST API / HTTP API v2 / ALB) directly
 * into the Express clinical engine without altering route logic or middleware.
 */

let serverlessExpressInstance;

async function setup(event, context) {
  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
}

export const handler = async (event, context) => {
  if (serverlessExpressInstance) {
    return serverlessExpressInstance(event, context);
  }
  return setup(event, context);
};

export default handler;
