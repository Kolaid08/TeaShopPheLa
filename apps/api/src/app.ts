import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index';
import v1Routes from './routes/v1.routes';
import { errorHandler } from './middleware/errorHandler';
import path from 'path';

const app: Express = express();

// Standard Production Middlewares
app.use(
  cors({
    origin: [config.clientUrl, config.customerClientUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Expose static local uploads folder (optional, good for serving drink pictures)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Root Health check endpoint (as requested: GET /health returns { status: "ok" })
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Versioned APIs
app.use(`/api/${config.apiVersion}`, v1Routes);

// Catch-all route for unmatched paths (404)
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Resource not found',
  });
});

// Global Exception / Error handling middleware
app.use(errorHandler);

export default app;
