const mongoose = require('mongoose'),
	Constants = require('../../config/constants');

const async = require('async');
const  commonFunctions = require('../../config/commons');
const userController = require('../controllers/usercontroller');
const _ = require('lodash');
// const { logger } = require('../../config/common/log/logger');


const moment = require('moment'),
	mtz = require('moment-timezone'),
	request = require('request');
// const vehicle = require('../models/vehicle');
// const user = require('../models/user');
const store = require('../store/store');

exports.addNewVehicle = (req, res) => {
	let {vehicleDetail} = req.body;

	if (!vehicleDetail.QRLink) {
		vehicleDetail.QRLink = 'UNLINKED';
	}

	if (!vehicleDetail.color) {
		vehicleDetail.color = 'UNSPECIFIED';
	}

	store.createNewVehicle(vehicleDetail, req.body.userId)
		.then(resolve => {
			if (resolve.QRLink !== 'UNLINKED') {
				addGuidePointVehicle(resolve.QRLink, resolve.name, resolve.make, resolve.name, resolve.year, resolve.color, resolve.vin, resolve._id, res);
			} else {
				res.json({
					status: 'SUCCESS',
					payload: resolve._id
				});
			}
		})
		.catch(reject => {
			console.log({reject, req});

			res.json({
				status: 'ERROR',
				err: reject
			});
		});
};

function addGuidePointVehicle(esn, vehicleName, make, model, year, color, vin, id, res) {
	request({
		method: 'POST',
		uri: `${Constants.SERVER.GUIDEPOINT_BASE}unit/activate?token=${process.env.GUIDEPOINT_TOKEN}`,
		json: true,
		body: { esn, vehicleName, make, model, year, color, vin }
	}, function(error, response, body) {
		if (!error && response.statusCode === 200) {
			return res.json({
				status: 'SUCCESS',
				payload: id
			});
		} else {
			store.findOneVehicleByIdAndDelete(id.toString());

			console.error({error, code: response.statusCode, body});
			return res.json({
				status: 'ERROR',
				err: 'QRLINK error: ' + body.error
			});
		}
	});
}

function removeGuidePointVehicle(vehicles, firstname, lastname, email, type = 'removed', callback) {
	request({
		method: 'POST',
		uri: `${Constants.SERVER.GUIDEPOINT_BASE}removevehicles/remove-vehicles?token=${process.env.GUIDEPOINT_TOKEN}`,
		json: true,
		body: { vehicles, firstname, lastname, email, type }
	}, function(error, response, body) {
		if (!error && response.statusCode == 200) { 
			console.log('success?');
		}
		else {
			getVehicleInfo(vehicles[0], callback);
		}
	});
}

function getVehicleInfo(id, callback) {
	request({
		method: 'GET',
		uri: `${Constants.SERVER.GUIDEPOINT_BASE}admin/vehicleinfo?token=${process.env.GUIDEPOINT_TOKEN}&id=${id}`,
		json: true
	}, callback);
}
//
// function removeVehicleByQRLink(QRLink, firstName, lastName, email, res, callback) {
// 	return request({
// 		method: 'GET',
// 		uri: `${Constants.SERVER.GUIDEPOINT_BASE}unit/info?token=${process.env.GUIDEPOINT_TOKEN}&esn=${QRLink}`,
// 		json: true
// 	}, function(error, response, body) {
// 		if (!error && response.statusCode == 200) {
// 			return removeGuidePointVehicle([body.vehicle_id], firstName, lastName, email, null, callback);
// 		} else {
// 			return res.json({
// 				err: body.error,
// 				status: 'ERROR'
// 			});
// 		}
// 	});
// }


exports.editVehicleDetail = async (req, res) => {
	try {
		let {vehicleProperties, vehicleID} = req.body;
		if(vehicleProperties.fuelVolume) {
			vehicleProperties.fuelVolume = commonFunctions.enumToPercent(vehicleProperties.fuelVolume);
		}
		const vehicle = await store.findOneVehicleAndUpdate({_id: vehicleID},
			{
				$set: vehicleProperties,
			}, {
				useFindAndModify: false,
				new: true
			});

		res.json({
			err: null, opStatus: vehicle
		});
	} catch (error) {
		console.error({err: error, requestBody: req.body});
		res.json({
			status: 'ERROR',
			err: error
		});
	}
};


exports.findVehicles = (req, res) => {
	let {searchTerm} = req.query;
	if (commonFunctions.isNullOrUndefined(searchTerm) || searchTerm.length < 2) {
		return res.json({err: 'Search Term needs to have 2 characters at least'});
	}
	let searchReg = {$regex: searchTerm, $options: 'i'};
	store.findVehicles({
		$or: [
			{stockNumber: searchReg},
			{licensePlate: searchReg},
			{name: searchReg},
			{vin: searchReg},
		],
		isDeleted: {$ne: true}
	})
		.then(vehicleList => {
			return res.send({vehicleList});
		})
		.catch(err => {
			console.error({err, requestBody: req.body});
			// logger.error({err, req});
			return res.send({
				status: 'ERROR',
				err
			});
		});
};

exports.getAllAvailableVehicles = (req, res) => {
	// async.waterfall([
	//     function (callback) {
	//         Contract.find({
	//             vehiclePickupTimeStamp: {$gte: moment.now()},
	//             // vehicleDropOffTimeStamp: {$gte: moment.now()},
	//             vehicleID: {$exists: true},
	//             contractType: 'RESERVATION'
	//         }, {}, {lean: true})
	//             .then(cts => {
	//                 callback(null, cts)
	//             })
	//             .catch(err => {
	//                 callback(err)
	//             })
	//     },
	//     function (contracts, callback) {
	//     //console.log(contracts);
	//         Vehicle
	//             .find({status: 'AVAILABLE'}, {}, {lean: true})
	//             .then(async vehicleList => {
	//                 await vehicleList.forEach(vcl => {
	//                     let it = _.find(contracts, function (ctr) {
	//                         // console.log({vcl});
	//                         return ctr.vehicleID === vcl._id
	//                     })
	//                     if(it) {
	//                         it.isReserved = true
	//                     }
	//                 })
	//                 callback(null, vehicleList)
	//             })
	//             .catch(err => {
	//                 return res.send({err});
	//             })
	//     }
	// ], (err, availableVehicles) => {
	//     return res.json({err, availableVehicles})
	// })
	async.waterfall([
		function (callback) {
			store.findVehicles({
				status: 'AVAILABLE',
				isDeleted: {$ne: true},
				QRLink: {$nin: ['UNLINKED',  null, 0, undefined, false, '']},
				stockNumber: {$nin: [/^0000.*/, null, 0, undefined, false, '']},
				licensePlate: {$nin: [/^0000.*/, null, 0, undefined, false, '']},
				vin: {$nin: [/^0000.*/, null, 0, undefined, false, '']},
				fuelTankSizeInLiters: {$nin: [null, undefined, 0]},
			},null, {
				lean: true
			}, (err, vehicles) => {
				if (err) console.error({err, requestBody: req.body});
				// if (err) logger.error({err, req});
				callback(err, vehicles);
			});
		},
		function (availableVehicleList, callback) {
			store.findContracts({
				vehicleID: {$exists: true},
				vehiclePickupTimeStamp: {$gte: moment.now()},
				contractType: 'RESERVATION',
				isCancelled: false
			}, null, null, async (err2, bookedVehicles) => {
				await bookedVehicles.forEach(bv => {
					if(bv.contractType === 'RENTAL'){
						_.remove(availableVehicleList, {_id: bv.vehicleID});
					} else if(bv.contractType === 'RESERVATION') {
						availableVehicleList.forEach((av) => {
							// console.log(av._id + "  " + bv.vehicleID);
							if(String(av._id) === String(bv.vehicleID)) {
								// console.log("match");
								av.isReserved = true;
								if(!av.reservationList){
									av.reservationList = [];
								}
								av.reservationList.push(bv);
							}
						});

					}
				});
				callback(null, availableVehicleList);
			});
		}
	], (err, assignableVehicles) => {
		if (err) console.error({err, requestBody: req.body});
		return res.json({err, assignableVehicles});
	});
};


exports.getAllUnavailableVehicles = (req, res) => {
	store.findVehicles({
		isDeleted: {$ne: true},
		$or: [
			{status: {$ne: 'AVAILABLE'}}, 
			{QRLink: {$in: ['UNLINKED',  null, 0, undefined, false, '']}},
			{stockNumber: {$in: [/^0000.*/, null, 0, undefined, false, '']}},
			{licensePlate: {$in: [/^0000.*/, null, 0, undefined, false, '']}},
			{vin: {$in: [/^0000.*/, null, 0, undefined, false, '']}},
			{fuelTankSizeInLiters: {$in: [null, undefined, 0]}},
		]
	}, 
	null, 
	{lean: true})
		.then(vehicleList => {

			let appendedVehicleList = vehicleList;
			async.eachLimit(appendedVehicleList, 10, (vehicleDetail, callback) => {
				store.findCustomerById(vehicleDetail.assignedTo,
					{
						emailAddress: 1,
						firstName: 1,
						lastName: 1,
					},
					null,
					(err, cProfile) => {
						if (err) {
							vehicleDetail.customerInfo = err;
							callback();
						} else {
							// console.log(cProfile);
							vehicleDetail.customerInfo = cProfile;
							callback();
						}
					});
			}, (err) => {
				if (err) {
					console.error({err, requestBody: req.body});
					// logger.error({err, req});
					return res.send({err});
				}
				return res.send({vehicleList: appendedVehicleList});
			});
		})
		.catch(err => {
			console.error({err, requestBody: req.body});
			// logger.error({err, req});
			return res.send({err});
		});
};

exports.addIssue = async (req, res) => {
	let {newIssue, vehicleID} = req.body;
	if (commonFunctions.isNullOrUndefined(newIssue)
        || commonFunctions.isNullOrUndefined(vehicleID)) {
		return res.json({err: 'Incorrect parameters'});
	}
	newIssue.createdBy = req.body.userId;
	let creator = await userController.getUserByID(req.body.userId);
	// console.log(creator);
	newIssue.createdByName = creator.firstName + ' ' + creator.lastName;
	store.findOneVehicleAndUpdate({
		_id: vehicleID
	}, {
		$addToSet: {issues: newIssue}
	}, {
		new: true
	})
		.then(resolve => {
			return res.send({vehicleDetails: resolve});
		})
		.catch(err => {
			console.error({err, requestBody: req.body});
			// logger.error({err, req});
			return res.send({err});
		});
};

exports.getVehiclebyID = (vehicleID, callback) => {
	store.findOneVehicle({_id: vehicleID, isDeleted: {$ne: true}}, null, null, (err, vehicle) => {
		callback(err, vehicle);
	});
};

exports.changeVehicleAvailability = async (req, res) => {
	try {
		const { vehicleID, availability } = req.body;

		const vehicle = await store.findOneVehicleAndUpdate(
			{_id: vehicleID},
			{ status: availability },
			{ new: true }
		);

		res.send({vehicleDetails: vehicle});
	} catch (err) {
		console.error({err, requestBody: req.body});
		// logger.error({err, req});
		res.send({
			err,
			status: 'ERROR'
		});
	}
};

exports.getAvailableVehiclesByTime = async (req, res) => {
	try {
		const { vehiclePickupTime, vehicleDropOffTime } = req.query;

		const pickup = Date.parse(vehiclePickupTime);
		const dropOff = Date.parse(vehicleDropOffTime);

		const unavailable = await findOverLappingContracts(pickup, dropOff);

		const available = await store.findVehicles(
			{
				_id: { $nin: unavailable }, 
				QRLink: {$nin: ['UNLINKED',  null, 0, undefined, false, '']},
				isDeleted: {$ne: true},
				stockNumber: {$nin: [/^0000.*/, null, 0, undefined, false, '']},
				licensePlate: {$nin: [/^0000.*/, null, 0, undefined, false, '']},
				vin: {$nin: [/^0000.*/, null, 0, undefined, false, '']},
				fuelTankSizeInLiters: {$nin: [null, undefined, 0]},
				status: 'AVAILABLE'
			});


		res.json({
			available
		});
	} catch (err) {
		console.error({err, requestBody: req.body});
		// logger.error({err, req});
		res.json({
			status: 'ERROR',
			err: 'Unable to get available vehicles by time.' + err.toString(),
		});
	}
};

async function findOverLappingContracts(vehiclePickUpTime, vehicleDropOffTime) {

	const unavailable = await store.findContracts(
		{
			$or: [
				{
					$and: [
						{ vehiclePickupTimeStamp: { $gte: vehiclePickUpTime } }, 
						{ vehiclePickupTimeStamp: { $lte: vehicleDropOffTime} }
					]
				},
				{ 
					$and: [
						{ vehiclePickupTimeStamp: { $lte: vehiclePickUpTime } },
						{ vehicleDropOffTimeStamp: { $gte: vehicleDropOffTime } }
					]
				},
				{
					$and: [
						{ vehicleDropOffTimeStamp: { $gte: vehiclePickUpTime } },
						{ vehicleDropOffTimeStamp: { $lte: vehicleDropOffTime} }
					]
				}
			],
			isCancelled: {$ne: true},
			contractType: {$ne: 'RESERVATION'}
		},
		{ vehicleID: 1 }
	);

	return unavailable.map(vehicle => vehicle.vehicleID);
}

exports.deregisterVehicle = async (req, res) => {
	let {vehicleID} = req.body;

	if(!mongoose.Types.ObjectId.isValid(vehicleID)){
		return res.json({err: 'invalid vehicle id'});
	}

	const vehicleDetails = await store.findOneVehicle({_id: vehicleID});

	if(vehicleDetails == null) {
		return res.json({err: 'Vehicle not found'});
	}

	try {
		store.updateOneVehicle({_id: vehicleID}, {
			$set: {
				['status']: 'DISPOSED'
			}
		}, (err, status) => {
			if (err) console.error({err, requestBody: req.body});
			// if (err) logger.error({err, req});
			return res.json({err, status});
		});
	} catch (e) {
		return res.json({err: e});
	}

};

exports.confirmVehiclePickup = async (req, res) => {
	try {
		const { vehicleID, contractID } = req.body;

		const contract = await store.findContractById(contractID);

		if (contract.vehicleID !== vehicleID) {
			throw new Error('Vehicle in contract does not match requested vehicle');
		}

		let stats;
		try {
			const vehicle = await store.findOneVehicle({_id: vehicleID}, {QRLink: 1});
			stats = await commonFunctions.getUpdatedVehicleStats(vehicle.QRLink);

		} catch (error) {
			throw new Error('Error confirming pickup.' + error.toString());
		}

		const currentFuel = stats.currentFuel;
		const batteryLevel = stats.batteryLevel;
		const currentOdometerinMiles = stats.currentOdometerinMiles;
		const currentOdometerinKilometres = stats.currentOdometerinKilometres;

		await store.findOneVehicleAndUpdate(
			{ _id: vehicleID },
			{
				$set: {
					['odometerCountInMiles']: currentOdometerinMiles,
					['odometerCountInKilometers']: currentOdometerinKilometres,
					['fuelVolume']: currentFuel,
					['batteryLevel']: batteryLevel,
					['statsUpdateAt']: moment().tz('America/Toronto'),
					['status']: 'UNAVAILABLE'
				}
			}
		);

		await store.findOneContractAndUpdate(
			{ _id: contractID },
			{
				$set: {
					['odometerReadingStart']: currentOdometerinKilometres,
					['odometerReadingStartInMiles']: currentOdometerinMiles,
					['fuelReadingStart']: currentFuel
				}
			}
		);

		return res.json({
			status: 'SUCCESS',
			payload: 'Successfully picked up vehicle'
		});

	} catch (error) {
		console.error({error, req});

		return res.json({
			status: 'ERROR',
			err: error.message
		});
	}
};
