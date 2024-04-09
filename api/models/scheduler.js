const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const SchedulerSchema = new Schema({
	scheduledAt: {
		type: String,
		required: true
	},
	objective: {
		type: String,
		enum: ['VEHICLE_STATUS_CHANGE']
	},
	routine: {
		type: String,
		enum: ['SINGLE_RUN', 'RECURRING'],
		default: 'SINGLE_RUN'
	},
	params: {
		type: Object
	},
	nextRunAt: String,
	lastRunAt: String,
	state: {
		type: String,
		enum: ['OPEN', 'CLOSED']
	}

}, {
	timestamps: true
});

module.exports = mongoose.model('Scheduler', SchedulerSchema);
