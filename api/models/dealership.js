const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const HolidayRange = require('./holidayRange');

const DealershipSchema = new Schema({
	startTime: {
		type: Date
	},
	endTime: {
		type: Date
	},
	createdBy: {
		type: String
	},
	users: {
		type: Array
	},
	businessHours: {
		startTime: String,
		endTime: String
	},
	additionalFeesPresets: [{
		createdAt: {
			type: Date,
			default: Date.now()
		},
		chargeFor: {
			type: String
		},
		chargeAmount: {
			type: Number
		}
	}],
	taxPresets: [{
		createdAt: {
			type: Date,
			default: Date.now()
		},
		taxFor: {
			type: String
		},
		taxRate: {
			type: Number
		},
		toggle: {
			type: Boolean,
			default: false
		}
	}],
	gasCharge: {
		type: String,
		default: '0'
	},
	preAuthPaymentAmount: {
		type: Number
	},
	odometerKMCharge: {
		type: String,
		default: '0'
	},
	freeKilometers: {
		type: Number
	},
	warrantyRate: {
		type: Number
	},
	verXCallLog: [{
		licenseNumber: String,
		createdBy: String,
		createdAt: {
			type: Date,
			default: Date.now()
		}
	}],
	holidays: [HolidayRange]
}, {
	timestamps: true
});

module.exports = mongoose.model('Dealership', DealershipSchema);
