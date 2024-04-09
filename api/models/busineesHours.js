const mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	BusinessHoursSchema = new Schema({
		startTime: {
			type: Date
		},
		endTime: {
			type: Date
		},
		createdBy: {
			type: String
		}
	}, {
		timestamps: true
	});

module.exports = mongoose.model('BusinessHours', BusinessHoursSchema);