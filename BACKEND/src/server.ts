import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { initializeEventSystem } from './common/events/index.js';

// Boot up asynchronous event-driven backbone
initializeEventSystem();

const app = createApp();

const server = app.listen(ENV.PORT, () => {
  console.log(`==============================================`);
  console.log(`🚀 Oakland School Backend Server is Running!`);
  console.log(`📡 URL: http://localhost:${ENV.PORT}`);
  console.log(`🔌 API Base: http://localhost:${ENV.PORT}/api/v1`);
  console.log(`🛡️ Architecture: Modular Monolith (MVC + Event-Driven)`);
  console.log(`⚙️ Environment: ${ENV.NODE_ENV}`);
  console.log(`==============================================`);
});

// Graceful termination handling
const shutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down backend server gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
