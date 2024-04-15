import './tracing';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import { Logger } from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(PinoLogger));

  const logger = new Logger('main');

  const config = new DocumentBuilder().setTitle('Crypto API').build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port).then(() => {
    logger.log(`Listening on port: ${port}`);
  });
}
bootstrap();
