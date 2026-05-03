const mongoose = require('mongoose');

const saleReportSchema = new mongoose.Schema({
  brand: {
    type: String,
    required: [true, 'Please add a car brand']
  },
  model: {
    type: String,
    required: [true, 'Please add a car model']
  },
  fuelType: {
    type: String,
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
    required: [true, 'Please add a fuel type']
  },
  boughtPrice: {
    type: Number,
    required: [true, 'Please add the bought price']
  },
  soldPrice: {
    type: Number,
    required: [true, 'Please add the sold price']
  },
  discount: {
    type: Number,
    default: 0
  },
  profit: {
    type: Number,
    required: true
  },
  soldDate: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SaleReport', saleReportSchema);
