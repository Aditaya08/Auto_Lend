import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startCronJobs } from './services/cronJobs.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Start Cron Jobs
startCronJobs();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Import Routes
import authRoutes from './routes/auth.js';
import dealerRoutes from './routes/dealer.js';
import lenderRoutes from './routes/lender.js';
import customerRoutes from './routes/customer.js';
import escrowRoutes from './routes/escrow.js';
import registryRoutes from './routes/registry.js';
import oracleRoutes from './routes/oracle.js';

// Define Routes
app.use('/auth', authRoutes);
app.use('/dealer', dealerRoutes);
app.use('/lender', lenderRoutes);
app.use('/', customerRoutes); // Mount at root since it has /marketplace and /customer
app.use('/escrow', escrowRoutes);
app.use('/registry', registryRoutes);
app.use('/oracle', oracleRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, data: 'API is running' });
});

// Centralized Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

export default app;
