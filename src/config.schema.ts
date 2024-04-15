import Joi from 'joi';

export const configValidationSchema = Joi.object({
  AUTH0_PUBLIC_KEY: Joi.string()
    .required()
    .description('Auth0 creds (3rd party: authorization)'),
  AUTH0_AUDIENCE: Joi.string()
    .required()
    .description('Auth0 creds (3rd party: authorization)'),
  AUTH0_DOMAIN: Joi.string()
    .required()
    .description('Auth0 creds (3rd party: authorization)'),
  AUTH0_CLIENT_ID: Joi.string()
    .required()
    .description('Auth0 creds (3rd party: authorization)'),
  AUTH0_CLIENT_SECRET: Joi.string()
    .required()
    .description('Auth0 creds (3rd party: authorization)'),
  AUTH0_CRYPTO_CONNECTION_NAME: Joi.string()
    .required()
    .description(
      'Auth0 custom crypto-wallet flow config (3rd party: authorization)',
    ),
  UNLEASH_URL: Joi.string()
    .required()
    .description('Unleash creds (3rd party: feature flags)'),
  UNLEASH_APP_NAME: Joi.string()
    .required()
    .description('Unleash creds (3rd party: feature flags)'),
  UNLEASH_INSTANCE_ID: Joi.string()
    .required()
    .description('Unleash creds (3rd party: feature flags)'),
  COVALENT_API_KEY: Joi.string()
    .required()
    .description('Covalent API creds (3rd party: web3 static data)'),
  QUICK_NODE_API_KEY: Joi.string()
    .required()
    .description(
      'QuickNode API creds (3rd party: web3 live updates via webhooks)',
    ),
  QUICK_NODE_DESTINATIONS_CONFIG_FILEPATH: Joi.string()
    .default('quicknode-destinations.json')
    .description(
      'Pre-liminary JSON file with destinations configuration QuickNode API (3rd party: web3 live updates)',
    ),
  REDIS_HOST: Joi.string().required().description('Redis connection (cache)'),
  REDIS_PORT: Joi.number().required().description('Redis connection (cache)'),
  DATABASE_URL: Joi.string()
    .required()
    .description('URL of Postgres-compatible DB to be used in Prisma ORM'),
  PORT: Joi.number().default(3000).description('PORT to run Nest on'),
});
