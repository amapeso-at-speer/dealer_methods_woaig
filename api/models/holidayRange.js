const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HolidayRange = new Schema({
	start: {
		type: Date
	},
	end: {
		type: Date
	},
	description: {
		type: String
	}
}, {
	timestamps: true
});

module.exports = HolidayRange;