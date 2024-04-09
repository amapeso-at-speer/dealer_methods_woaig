const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const uniqueValidator = require('mongoose-unique-validator');
const { determineESNStatus } = require('../../config/commons');
const autoIncrement = require('mongoose-auto-increment');
const Vehicle = new Schema({
	stockNumber: {
		type: String,
		trim: true,
		required: true,
		unique: true
	},
	vehicleNumber: {
		type: Number
	},
	licensePlate: {
		type: String,
		trim: true,
		required: true,
		unique: true
	},
	batteryLevel: {
		type: String,
	},
	name: {
		type: String,
		// trim: true,
		required: true,
		// unique: true
	},
	make: {
		type: String
	},
	year: {
		type: Number
	},
	status: {
		type: String,
		enum: ['AVAILABLE', 'UNAVAILABLE', 'DISPOSED', 'HARD_HOLD', 'RETURNED', 'SHUTTLE', 'IN_PREPERATION'],
		default: 'AVAILABLE'
	},
	fuelVolume: {
		type: String,
		// enum: ['FULL-TANK', 'EMPTY', 'HALF-TANK'],
		// default: 'EMPTY'
	},
	fuelTankSizeInLiters: {
		type: Number
	},
	odometerCountInMiles: {
		type: String
	},
	odometerCountInKilometers: {
		type: String
	},
	vin: {
		type: String,
		trim: true,
		required: true,
		unique: true,
		index: true
	},
	isVinExploded: {
		type: Boolean,
		default: false
	},
	category: {
		type: String,
		default: 'SERVICE-LOANER',
		enum: ['SERVICE-LOANER', 'RENTAL']
	},
	color: {
		type: String,
		default: 'UNSPECIFIED',
		enum: ['UNSPECIFIED', 'YELLOW', 'GREEN', 'ORANGE', 'BLUE', 'RED', 'PINK', 'BLACK', 'WHITE', 'GREY', 'PURPLE']
	},
	dailyRateCAD: {
		type: Number,
		required: true
	},
	statsUpdateAt: {
		type: Date,
		default: Date.now()
	},
	issues: [{
		issueDate: Date,
		description: String,
		createdBy: String,
		createdByName: String,
		createdAt: {
			type: Date,
			default: Date.now()
		},
		attachments: Array,
		notes: String,
		contractID: String
	}],
	QRLink: {
		type: String,
		default: 'UNLINKED',
		index: true
	},
	createdBy: {
		type: String,
		required: true
	},
	assignedTo: String,
	notes: [
		{
			s3Link: {
				type: String,
				default: null
			},
			description: {
				type: String
			}
		}
	],
	traccarProperties: {
		traccarID: Number
	},
	dealershipID: String,
	isDeleted: {
		type: Boolean,
		default: false
	}
}, {
	timestamps: true
});

autoIncrement.initialize(mongoose.connection);

Vehicle.plugin(uniqueValidator, {message: 'is already taken.'});
Vehicle.plugin(autoIncrement.plugin, { model: 'Vehicle', field: 'vehicleNumber'});

// Vehicle.pre('updateOne', function(next) {
// 	// calulate the status of vehicle on save
// 	console.log(this);
// });

Vehicle.pre('findOneAndUpdate', async function() {
	// calulate the status of vehicle on save
	const query = this.getFilter();
	const update = { ...this.getUpdate().$set };
	const docToUpdate = await this.model.findOne(query);

	const updatedVehicle = {...docToUpdate.toObject(), ...update };
	const newStatus = calculateVehicleStatus(updatedVehicle);

	this.getUpdate().$set.status = newStatus;
});

// calculate status of vehicle on update
function calculateVehicleStatus({QRLink, isDeleted, stockNumber, licensePlate, vin, fuelTankSizeInLiters, status, fuelVolume, batteryLevel, odometerCountInMiles}) {
	const esnStatus = determineESNStatus(QRLink, fuelVolume, batteryLevel, odometerCountInMiles); 
	if (isDeleted) {
		return 'DISPOSED';
	}
	else if ((esnStatus === 'DISCONNECTED') || 
		(!stockNumber || stockNumber.startsWith('0000')) || 
		(!licensePlate || licensePlate.startsWith('0000')) ||
		(!vin || vin.startsWith('0000')) ||
		!fuelTankSizeInLiters
	) {
		return 'IN_PREPERATION';
	} else if (status === 'IN_PREPERATION') {
		return 'AVAILABLE';
	} else {
		return status;
	}
}

module.exports = mongoose.model('Vehicle', Vehicle);

