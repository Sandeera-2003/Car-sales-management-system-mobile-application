require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./config/db');
const globalErrorHandler = require('./middleware/errorMiddleware');
const AppError = require('./utils/AppError');

// Import routes
const authRoutes = require('./features/auth/auth.routes');
const carRoutes = require('./features/cars/car.routes');
const bookingRoutes = require('./features/bookings/booking.routes');
const promotionRoutes = require('./features/promotions/promotion.routes');
const reviewRoutes = require('./features/inquiries/review.routes');
const reportRoutes = require('./features/reports/report.routes');
const userRoutes = require('./features/users/user.routes');
const inquiryRoutes = require('./features/inquiries/inquiry.routes');
const sparePartsRoutes = require('./features/spareParts/spareParts.routes');
const orderRoutes = require('./features/orders/orders.routes');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/cars', carRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/promotions', promotionRoutes);
app.use('/api/v1', reviewRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/inquiries', inquiryRoutes);
app.use('/api/v1/spare-parts', sparePartsRoutes);
app.use('/api/v1/orders', orderRoutes);

// Static folders
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Base route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to CarHub API',
    data: {}
  });
});

// Handle unhandled routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
