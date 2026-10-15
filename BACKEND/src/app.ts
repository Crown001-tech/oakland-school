import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './common/middleware/error.middleware.js';

export function createApp(): Express {
  const app = express();

  // Security & Cross-Origin Configuration
  app.use(
    cors({
      origin: [ENV.CORS_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-demo-role', 'X-Requested-With', 'Accept'],
    })
  );

  // Cookie and Body Parsing Middleware
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));


  // Request logger in development
  if (ENV.NODE_ENV !== 'production') {
    app.use((req, _res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
      next();
    });
  }

  // API Version 1 Router
  app.use('/api/v1', apiRouter);

  // 404 Not Found Handler
  app.use(notFoundHandler);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
