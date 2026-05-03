const Booking = require('../bookings/Booking.model');
const Car = require('../cars/Car.model');
const User = require('../auth/User.model');
const SaleReport = require('./SaleReport.model');
const { z } = require('zod');
const AppError = require('../../utils/AppError');

const saleReportSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  fuelType: z.enum(['Petrol', 'Diesel', 'Electric', 'Hybrid']),
  boughtPrice: z.coerce.number().min(0),
  soldPrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
  soldDate: z.string().or(z.date()).optional()
});

exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalCars = await Car.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: 'Pending' });

    // Calculate total revenue (assuming completed bookings have a car price)
    const completedBookings = await Booking.find({ status: 'Completed' }).populate('car', 'price');
    const totalRevenue = completedBookings.reduce((acc, curr) => acc + (curr.car?.price || 0), 0);

    // Get booking trends for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const trends = await Booking.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    res.status(200).json({
      success: true,
      message: 'Dashboard stats fetched successfully',
      data: {
        totalCars,
        totalUsers,
        totalBookings,
        pendingBookings,
        totalRevenue,
        trends
      }
    });
  } catch (err) { next(err); }
};

// Sale Report CRUD
exports.createSaleReport = async (req, res, next) => {
  try {
    const validatedData = saleReportSchema.parse(req.body);
    const profit = validatedData.soldPrice - validatedData.boughtPrice - (validatedData.discount || 0);
    
    const saleReport = await SaleReport.create({
      ...validatedData,
      profit,
      createdBy: req.user.id
    });

    res.status(201).json({ success: true, message: 'Sale report created successfully', data: saleReport });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
};

exports.getAllSaleReports = async (req, res, next) => {
  try {
    const reports = await SaleReport.find().sort({ soldDate: -1 });
    res.status(200).json({ success: true, data: reports });
  } catch (err) { next(err); }
};

exports.updateSaleReport = async (req, res, next) => {
  try {
    const validatedData = saleReportSchema.partial().parse(req.body);
    
    // Recalculate profit if prices changed
    let report = await SaleReport.findById(req.params.id);
    if (!report) return next(new AppError('Report not found', 404));

    const updatedData = { ...validatedData };
    const finalSoldPrice = validatedData.soldPrice !== undefined ? validatedData.soldPrice : report.soldPrice;
    const finalBoughtPrice = validatedData.boughtPrice !== undefined ? validatedData.boughtPrice : report.boughtPrice;
    const finalDiscount = validatedData.discount !== undefined ? validatedData.discount : report.discount;
    
    updatedData.profit = finalSoldPrice - finalBoughtPrice - finalDiscount;

    report = await SaleReport.findByIdAndUpdate(req.params.id, updatedData, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: 'Sale report updated successfully', data: report });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
};

exports.deleteSaleReport = async (req, res, next) => {
  try {
    const report = await SaleReport.findByIdAndDelete(req.params.id);
    if (!report) return next(new AppError('Report not found', 404));
    res.status(200).json({ success: true, message: 'Sale report deleted successfully' });
  } catch (err) { next(err); }
};

exports.getSaleAnalytics = async (req, res, next) => {
  try {
    const profitByFuel = await SaleReport.aggregate([
      { $group: { _id: "$fuelType", totalProfit: { $sum: "$profit" }, count: { $sum: 1 } } }
    ]);

    const profitByBrand = await SaleReport.aggregate([
      { $group: { _id: "$brand", totalProfit: { $sum: "$profit" }, count: { $sum: 1 } } },
      { $sort: { totalProfit: -1 } },
      { $limit: 5 }
    ]);

    const salesTrend = await SaleReport.aggregate([
      {
        $group: {
          _id: { month: { $month: "$soldDate" }, year: { $year: "$soldDate" } },
          totalSales: { $sum: "$soldPrice" },
          totalProfit: { $sum: "$profit" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        profitByFuel,
        profitByBrand,
        salesTrend
      }
    });
  } catch (err) { next(err); }
};
