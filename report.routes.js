const express = require('express');
const { 
  getDashboardStats, 
  createSaleReport, 
  getAllSaleReports, 
  updateSaleReport, 
  deleteSaleReport,
  getSaleAnalytics
} = require('./report.controller');
const { protect, authorize } = require('../../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('Admin', 'Staff'));

router.get('/dashboard', getDashboardStats);

// Sale Reports
router.post('/sales', createSaleReport);
router.get('/sales', getAllSaleReports);
router.get('/sales/analytics', getSaleAnalytics);
router.patch('/sales/:id', updateSaleReport);
router.delete('/sales/:id', deleteSaleReport);

module.exports = router;
