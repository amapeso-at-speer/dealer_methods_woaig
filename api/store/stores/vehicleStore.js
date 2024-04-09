const mongoose = require('mongoose');
const { getUpdatedVehicleStats, getFuelEnum, determineESNStatus } = require('../../../config/commons');
const Vehicle = mongoose.model('Vehicle');
const moment = require('moment');


function formatFields(vehicle, projection) {
	vehicle.ESNStatus = determineESNStatus(vehicle.QRLink, vehicle.fuelVolume, vehicle.batteryLevel, vehicle.odometerCountInMiles);

	vehicle.licensePlate = replaceUndefinedValueWithEmptyString(vehicle.licensePlate);
	vehicle.stockNumber = replaceUndefinedValueWithEmptyString(vehicle.stockNumber);
	vehicle.vin = replaceUndefinedValueWithEmptyString(vehicle.vin);
	vehicle.fuelVolumePercentage = vehicle.fuelVolume;
	vehicle.fuelVolume = formatFuel(vehicle.fuelVolume);

	if (projection) {
		let projectedObj = generateProjection(vehicle, projection);
		projectedObj.ESNStatus = vehicle.ESNStatus;
		
		return projectedObj;
	}
	return vehicle;
}

function generateProjection(vehicle, projection) {
	const allowed = Object.keys(projection).filter(key => projection[key]);
	const notAllowed = Object.keys(projection).filter(key => !projection[key]);

	if (allowed.length > 0) {
		const obj = {};
		allowed.forEach(key => {
			obj[key] = vehicle[key];
		});

		if (!notAllowed.includes('_id')){
			obj['_id'] = vehicle['_id'];
		}
		return obj;
	} else {
		for (const key of notAllowed) {
			delete vehicle[key];
		}
		return vehicle;
	}
}

function formatFuel(fuelVolume) {
	try {
		if (fuelVolume && !isNaN(parseFloat(fuelVolume))) {
			fuelVolume = getFuelEnum(parseFloat(fuelVolume));
		}
	} catch (e) {
		console.error('Exception while generating fuel Enum, defaulting to percentage: ' + e);
	}
	return fuelVolume;
}

function replaceUndefinedValueWithEmptyString(value) {
	try{
		if (value && value.startsWith('0000')) {
			return '';
		}
	} catch (e) {
		console.error('Error while formatting value with empty string: ' + e );
	}
	return value;
}

module.exports = {
	async findOneVehicleAndUpdate(criteria, updateObject, options, callback) {
		try {
			let vehicle = await Vehicle.findOneAndUpdate(criteria, updateObject, options, callback);

			if (options && options.lean) {
				return formatFields(vehicle);
			} else {
				return formatFields(vehicle.toObject());
			}
		} catch (error) {
			throw { error, criteria };
		}
	},

	async findVehicleById(id, projection, options, callback) {
		try {
			let vehicle = await Vehicle.findById(id, null, options);

			if (options && options.lean) {
				if (callback) {
					return callback(null, formatFields(vehicle, projection));
				}
				return formatFields(vehicle, projection);
			} else {
				if(callback) {
					return callback(null, formatFields(vehicle.toObject(), projection));
				}
				return formatFields(vehicle.toObject(), projection);
			}
		} catch (error) {
			if (callback) {
				return callback(error, null);
			}
			throw { error, id };
		}
	},

	async findVehicles(criteria, projection, options, callback){
		try {
			let vehicles = await Vehicle.find(criteria, null, options);

			vehicles.forEach((vehicle, index, array)=> {
				if (options && options.lean) {
					array[index] = formatFields(vehicle, projection);
				} else {
					array[index] = formatFields(vehicle.toObject(), projection);
				}
			});

			if (callback) {
				return callback(null, vehicles);
			} else {
				return vehicles;
			}
		} catch (error) {
			if (callback) {
				return callback(error, null);
			}
			throw { error, criteria };
		}
	},

	async findOneVehicle(criteria, projection, options, callback) {
		try {
			let vehicle = await Vehicle.findOne(criteria, null, options, callback);

			if (options && options.lean) {
				return formatFields(vehicle, projection);
			} else {
				return formatFields(vehicle.toObject(), projection);
			}
		} catch (error) {
			throw { error, criteria };
		}
	},
	async saveVehicle(vehicle) {
		try {
			return await vehicle.save();
		} catch (error) {
			throw {error, vehicle};
		}
	},

	async createNewVehicle(vehicleData, createdById) {
		try {

			const vehicle = new Vehicle(vehicleData);
			vehicle.createdBy = createdById;

			let stats = await getUpdatedVehicleStats(vehicle.QRLink);

			vehicle.fuelVolume = stats.currentFuel;
			vehicle.batteryLevel = stats.batteryLevel;
			vehicle.odometerCountInMiles = stats.currentOdometerinMiles;
			vehicle.odometerCountInKilometers = stats.currentOdometerinKilometres;
			vehicle.statsUpdateAt = moment().tz('America/Toronto');

			return await this.saveVehicle(vehicle);
		} catch (error) {
			throw { error, vehicleData };
		}
	},

	async updateOneVehicle(criteria, updateObject, callback) {
		try {
			let vehicle = await Vehicle.findOneAndUpdate(criteria, updateObject, callback);

			return formatFields(vehicle.toObject());
		} catch (error) {
			throw { error, criteria };
		}
	},

	async findOneVehicleByIdAndDelete(id) {
		try {
			return await Vehicle.findOneAndDelete({_id: id});
		} catch (error) {
			throw { error };
		}
	}
};
