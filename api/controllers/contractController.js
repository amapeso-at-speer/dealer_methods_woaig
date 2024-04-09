const mongoose = require('mongoose');
const moment = require('moment');
const mtz = require('moment-timezone');
const _ = require('lodash');
const async = require('async');

const Constants = require('../../config/constants');
const commonFunctions = require('../../config/commons');
// const { logger } = require('../../config/common/log/logger');
const vechicleController = require('../controllers/vehicleController');
const customerProfileController = require('../controllers/customerProfileController');

const store = require('../store/store');
const Scheduler = mongoose.model('Scheduler');

const ObjectId = mongoose.Types.ObjectId;

const AMQService = require('../util/AMQService');
const generateReservationConfirmedEmail = require('../../config/emailTemplates/generateReservationConfirmedEmail');

exports.openContract = async (req, res) => {
	try {
		let {
			vehicleID, customerID, userId, signatureImage,
			vehiclePickupTimeStamp, vehicleDropOffTimeStamp, cardDetails, cardExpiryDate, odometerReadingStart, fuelReadingStart, odometerReadingStartInKilometers,
			additionalDriver, contractType, repairOrderNumber
		} = req.body;

		if (commonFunctions.isNullOrUndefined(vehicleID) ||
			commonFunctions.isNullOrUndefined(customerID) ||
			commonFunctions.isNullOrUndefined(userId)
		) {
			const err = 'All parameters not supplied';
			console.error({err, requestBody: req.body});
			// logger.error({err, req});
			return res.json({
				status: 'ERROR',
				err
			});
		}

		let serviceAdvisor = userId;

		if (!commonFunctions.isNullOrUndefined(req.body.serviceAdvisor)) {
			serviceAdvisor = req.body.serviceAdvisor;
		}

		if (commonFunctions.isNullOrUndefined(contractType)) {
			contractType = 'RENTAL';
		}

		// //ALL CHECKS
		let userP = store.findOneUser({_id: userId}, {_id: 1, dealershipID: 1});
		let customerP = store.findOneCustomer({_id: customerID});

		let [user, customer] = await Promise.all([userP, customerP]);

		const today = moment(Date.now()).format('YYYY-MM-DD');
		const dealershipHolidays = await store.findOneDealershipHoliday({
			dealershipID: user.dealershipID,
			holidays: { $in: [vehiclePickupTimeStamp, today]}
		});

		if (dealershipHolidays) {
			const err = 'You cannot pickup a vehicle, or open a contract on dealership holidays.';
			console.error({err, requestBody: req.body});
			// logger.error({err, req});
			return res.json({
				status: 'ERROR',
				err
			});
		}

		if (user === null || user._id === null || customer === null || customer === undefined || customer.customerStatus !== 'ACTIVE') {
			const err = 'Customer not eligible';
			console.error({err, requestBody: req.body});
			// logger.error({err, data: [customer, user], req});
			return res.json({
				status: 'ERROR',
				err,
				customer,
				user
			});
		}

		const vehicle = await store.findOneVehicle({_id: vehicleID, isDeleted: {$ne: true}});

		if (!vehicle) {
			return res.json({status: 'ERROR', err: 'Vehicle is currently unavailable'});
		}

		const userEmail = customer.emailAddress;
		const QRlink = vehicle.QRLink;

		const stats = await commonFunctions.getUpdatedVehicleStats(QRlink);

		const odometerReadingInMiles = odometerReadingStart ? odometerReadingStart : stats.currentOdometerinMiles;
		const odometerReadingInKilo = odometerReadingStartInKilometers ? odometerReadingStartInKilometers  : stats.currentOdometerinKilometres;
		const fuelReadingPercentage = fuelReadingStart ? commonFunctions.enumToPercent(fuelReadingStart) : stats.currentFuel;
		const fuelReading = fuelReadingStart ? fuelReadingStart : commonFunctions.getFuelEnum(stats.currentFuel);

		//set assignedTo/fuel/odometer/batterlevel and make unavailable
		await store.findOneVehicleAndUpdate({_id: vehicleID},
			{
				$set: {
					['assignedTo']: customerID,
					['batteryLevel']: stats.batteryLevel,
					['odometerCountInMiles']: odometerReadingInMiles,
					['odometerCountInKilometers']: odometerReadingInKilo,
					['fuelVolume']: stats.currentFuel,
					['statsUpdateAt']: moment().tz('America/Toronto'),
					['status']: 'UNAVAILABLE'
				}
			},
			{
				new: true,
				useFindAndModify: false
			});

		const resolvedContract = await store.createContract({
			customerProfileID: customerID,
			vehicleID: vehicleID,
			createdBy: userId,
			QRCode: QRlink,
			signatureImage: signatureImage,
			vehiclePickupTimeStamp: vehiclePickupTimeStamp,
			vehicleDropOffTimeStamp: vehicleDropOffTimeStamp,
			serviceAdvisor: serviceAdvisor,
			cardDetails: cardDetails,
			cardExpiryDate: cardExpiryDate,
			odometerReadingStart: odometerReadingInMiles,
			odometerReadingStartInKilometers: odometerReadingInKilo,
			fuelReadingStart: fuelReading,
			fuelLabelStartPercentage: fuelReadingPercentage,
			additionalDriver: additionalDriver,
			contractReferenceID: convertBase.dec2hex(Date.now().valueOf()).toUpperCase(),
			contractType: contractType,
			repairOrderNumber: repairOrderNumber
		});


		if(additionalDriver) {
			store.updateOneCustomer({
				_id: customerID
			},
			{
				$addToSet: {
					lastAdditionalDriver: { $each: additionalDriver }
				}
			}, (err) => {
				if (err) {
					// logger.error({err, req});
					console.error({err, requestBody: req.body});
				}
			});
		}

		const payload = JSON.stringify(await customerProfileController.getDocGenerationInfo(
			userEmail,
			vehicle.licensePlate,
			resolvedContract._id
		));
		

		await AMQService.publishToQueue(process.env.CONTRACT_EMAIL_QUEUE, payload)
			.catch(err => {
				console.error('qPush Failed' + err);
			});
		
		console.log('qPush successful for contract id:'  + resolvedContract._id);

		return res.send({
			err: null,
			contractDetails: resolvedContract
		});

	} catch (error) {
		return res.json({err: error, status: 'ERROR'});
	}
};


let convertBase = function () {
	function convertBase(baseFrom, baseTo) {
		return function (num) {
			return parseInt(num, baseFrom).toString(baseTo);
		};
	}
	convertBase.bin2dec = convertBase(2, 10);
	convertBase.bin2hex = convertBase(2, 16);
	convertBase.dec2bin = convertBase(10, 2);
	convertBase.dec2hex = convertBase(10, 16);
	convertBase.hex2bin = convertBase(16, 2);
	convertBase.hex2dec = convertBase(16, 10);
	return convertBase;
}();

exports.closeContract = async (req, res) => {
	let {vehicleID, contractID, userId,  odometerReadingEndInKilometers, odometerReadingEnd, fuelReadingEnd } = req.body;


	// if (odometerReadingEnd === null || odometerReadingEnd === undefined) {
	// 	// CONNECT WITH WEB PORTAL
	// 	odometerReadingEnd = 550;
	// 	fuelReadingEnd = 200;
	// 	// USE DEFAULT IF NOT SUPPLIED
	// }

	if (vehicleID === null || vehicleID === undefined || contractID === null || contractID === undefined || userId === null || userId === undefined) {
		const err = 'Wrong params';
		console.error({err, vehicleID, contractID, userId, req});
		// logger.error({err, vehicleID, contractID, userId, req});
		return res.json({status: 'ERROR', err, vehicleID, contractID, userId});
	}
	

	let stats;
	try {
		const vehicle = await store.findOneVehicle({_id: vehicleID}, {QRLink: 1});
		stats = await commonFunctions.getUpdatedVehicleStats(vehicle.QRLink);
	} catch (error) {
		console.error({error, req});
		return res.json({
			status: 'ERROR',
			message: 'Error closing contract. could not fetch device'
		});
	}

	const currentFuelContractPercent = fuelReadingEnd ? commonFunctions.enumToPercent(fuelReadingEnd) : stats.currentFuel;
	const fuelReading = fuelReadingEnd ? fuelReadingEnd : commonFunctions.getFuelEnum(stats.currentFuel);

	const currentFuelVehicle = fuelReadingEnd ? commonFunctions.enumToPercent(fuelReadingEnd) : stats.currentFuel;
	const batteryLevel = stats.batteryLevel;
	const currentOdometerinMiles = odometerReadingEnd ? odometerReadingEnd : stats.currentOdometerinMiles;
	const currentOdometerinKilometres = odometerReadingEndInKilometers ? odometerReadingEndInKilometers : stats.currentOdometerinKilometres;
	

	const dropOff = moment().subtract(1, 'minutes');

	store.findOneContractAndUpdate({_id: contractID},
		{
			$set: {
				['closeTimeStamp']: Date.now(),
				['closedBy']: userId,
				['odometerReadingEnd']: currentOdometerinMiles, // if from front end use value
				['odometerReadingEndInKilometers']: currentOdometerinKilometres, // if from front end use value
				['fuelReadingEnd']: fuelReading,
				['fuelLabelEndPercentage']: currentFuelContractPercent,
				['vehicleDropOffTimeStamp']: dropOff
			}
		}, {
			new: true
		}, (err, contract) => {
			if (err || contract === null) {
				console.error({err, requestBody: req.body});
				// logger.error({err, req});
				return res.send({
					status: 'ERROR',
					err: err
				});
			} else {
				store.findOneVehicleAndUpdate({_id: vehicleID}, {
					$set: {
						['status']: 'RETURNED',
						['assignedTo']: null,
						['odometerCountInMiles']: currentOdometerinMiles, // use value from request if provided
						['odometerCountInKilometers']: currentOdometerinKilometres, // use value from request if provided
						['fuelVolume']: currentFuelVehicle,
						['batteryLevel']: batteryLevel,
						['statsUpdateAt']: moment().tz('America/Toronto')
					}
				}, {
					new: true
				}, (err2, result) => {
					if (err2) {
						// logger.error({err2, req});
						console.error({err2, req});
						return res.json({status: 'ERROR', err: err2});
					}
					let scheduler = new Scheduler({
						scheduledAt: moment(moment.now()).add(15, 'minutes').format('YYYY/MM/DD-HH:mm'),
						objective: 'VEHICLE_STATUS_CHANGE',
						params: {vehicleID, statusTo: 'AVAILABLE'},
						state: 'OPEN'
					});
					scheduler.save();
					return res.send({contract, vehicleNewAvailability: result.status});
				});
			}
		});


};

exports.getAllReservations = (req, res) => {
	let startDate = moment().subtract(1, 'months');
	let finalDate = moment().add(2, 'months');
	store.findContracts({
		vehiclePickupTimeStamp: {
			$gte: startDate
		},
		$or: [
			{vehicleDropOffTimeStamp: {$exists: false}},
			{vehicleDropOffTimeStamp: {$lte: finalDate}}
		],
		closedBy: {$exists: false}
	},
	{
		createdAt: 0,
		updatedAt: 0,
		additionalDriver: 0
	},
	{
		lean: true
	})
		.then(allEvents => {
			async.eachLimit(allEvents, 20, (singleContract, callback) => {
				// console.log({singleContract});
				if(!singleContract.vehicleID){
					singleContract.stockNumber = 'noValidVehicleAttached';
					callback(null);
				} else {
					store.findVehicleById(singleContract.vehicleID,
						{stockNumber: 1},
						{lean: true})
						.then(vehicleDetail => {
							singleContract.stockNumber = vehicleDetail.stockNumber;
							callback(null);
						})
						.catch((err) => {
							const error = 'noValidVehicleAttached';
							console.error({err, error, req});
							// logger.error({err, error, req});
							singleContract.stockNumber = error;
							callback(null);
						});
				}
			},
			() => {
				return res.send({allEvents});
			}
			);
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


exports.getContractsByCustomerID = (req, res) => {
	let {customerProfileID} = req.body;
	//console.log(true);
	store.findContracts({
		customerProfileID: customerProfileID
	})
		.then(allContracts => {
			return res.send({allContracts});
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


exports.getActiveContractsByCustomerID = (req, res) => {
	let {customerProfileID} = req.body;
	//console.log(true);
	store.findContracts({
		customerProfileID: customerProfileID,
		'closeTimeStamp': {'$exists': false}
	})
		.then(allContracts => {
			return res.send({allContracts});
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

exports.editContract = (req, res) => {
	let {contractProperties, contractID} = req.body;
	store.findOneContractAndUpdate(
		{_id: contractID},
		{$set: contractProperties},
		{
			new: true,
			useFindAndModify: false
		},
		(err, updatedContract) => {
			if(err){
				console.error({err, requestBody: req.body});
				// logger.error({err, req});
				return res.send({
					status: 'ERROR',
					err
				});
			}  else {
				return res.send({err, updatedContract});
			}
		});
};

exports.cancelContract = (req, res) => {
	let {vehicleID, contractID, userId} = req.body;
	// console.log({vehicleID, contractID, userId});
	if (!vehicleID || !contractID  || !userId) {
		const err = 'Wrong params';
		console.error({err, vehicleID, contractID, userId: userId});
		// logger.error({err, vehicleID, contractID, userId: userId, req});
		return res.json({status: 'ERROR', err, vehicleID, contractID, userId: userId});
	}
	store.findOneContractAndUpdate({_id: contractID},
		{
			$set: {
				['closedBy']: userId,
				['isCancelled']: true,
				['vehicleDropOffTimeStamp']: moment(Date.now()).subtract(10, 'minutes').toDate()
			}
		}, {
			new: true
		}, (err, contract) => {
			if (err || contract === null) {
				// logger.error(err);
				console.error({err});
				return res.send({status: 'ERROR', err});
			} else {
				store.findOneVehicleAndUpdate({_id: vehicleID}, {
					$set: {
						['status']: 'AVAILABLE',
						['assignedTo']: null
					}
				}, {
					new: true
				}, (err2, result) => {
					if (err2) {
						console.error({err, err2, req});
						// logger.error({err, err2, req});
						return res.json({status: 'ERROR', err: err2});
					}
					return res.send({contract, vehicleNewAvailability: result.status});
				});
			}
		});
};

exports.createNewReservation = async (req, res) => {
	
	let {customerEmail, customerProfileID, customerName, customerContactNumber, vehiclePickupTimeStamp, vehicleDropOffTimeStamp, reservationCategory} = req.body;
	if(!customerEmail && !customerProfileID){
		const err = 'No customer details provided';
		console.error({err, requestBody: req.body});
		// logger.error({err, req});
		return res.json({
			status: 'ERROR',
			err
		});
	} else if(!customerEmail) {
		customerEmail = await store.findOneCustomer({_id: customerProfileID}, {emailAddress: 1}).emailAddress;
	} else if(!customerProfileID) {
		customerProfileID = 'RESERVATION';
	}

	store.createContract(req.body, req.body.userId, 'RESERVATION', customerProfileID, customerEmail, reservationCategory, convertBase.dec2hex(Date.now().valueOf()).toUpperCase())
		.then(resolvedReservation => {
			res.json({err: null, resolvedReservation});
			
			let params = generateReservationConfirmedEmail(customerEmail, customerName, customerContactNumber, vehiclePickupTimeStamp);

			commonFunctions.sendTextEmail(params, (err, success) => {
				if (err) {
					console.error({err, requestBody: req.body});
					// logger.error({err, req});
				}
			});
		})
		.catch(reject => {
			console.log({reject, req});
			// logger.error({reject, req});
			return res.json({status: 'ERROR', err: reject});
		});
};

exports.findAssignableVehiclesForDuration = (req, res) => {
	let {startDate, endDate} = req.body;
	console.log({mP: mtz().toDate()});
	startDate = mtz(startDate).toDate();
	endDate = mtz(endDate).toDate();
	// console.log(startDate, endDate);
	async.waterfall([
		function (callback) {
			store.findVehicles({
				status: 'AVAILABLE'
			}, null, {
				lean: true
			}, (err, vehicles) => {
				console.error({err, requestBody: req.body});
				// if (err) logger.error({err, req});
				callback(err, vehicles);
			});
		},
		function (availableVehicleList, callback) {
			let find = store.findContracts({
				vehicleID: {$exists: true},
				vehiclePickupTimeStamp: {$gte: startDate, $lte: endDate},
				isCancelled: false,
				$or: [
					{
						vehicleDropOffTimeStamp: {
							$exists: false
						}
					},
					{
						vehicleDropOffTimeStamp: {
							$gte: startDate, $lte: endDate
						}
					}
				]
			}, {
				vehicleID: 1,
				contractType: 1
			}, null, async (err2, bookedVehicles) => {
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
		console.error({err, requestBody: req.body});
		// if (err) logger.error({err, req});
		if (err) {
			return res.json({status: 'ERROR', err, assignableVehicles});
		}
		return res.json({assignableVehicles});
	});
};

exports.getRunningContracts = async (req, res) => {
	let tnow = mtz(Date.now()).toDate();
	store.findContracts({
		$or: [
			{'closeTimeStamp': {$exists: false}},
			{'closeTimeStamp': {$gt: tnow}}
		],
		isCancelled: false
	}, {
		transactions: 0,
		verXResponse: 0
	}, {lean: true})
		.then(async runningContracts => {
			// console.log(1);
			let vechicleIds = new Set(), customerIds= new Set();
			await async.eachLimit(runningContracts, 10, async (rc) => {
				if(rc.vehicleID) vechicleIds.add(rc.vehicleID);
				if(rc.customerProfileID) customerIds.add(rc.customerProfileID);
			});
			vechicleIds = Array.from(vechicleIds).map(vid => {
				if(ObjectId.isValid(vid)) {
					return ObjectId(vid);
				}
			});
			customerIds = Array.from(customerIds).map(cid => {
				if(ObjectId.isValid(cid)) {
					return ObjectId(cid);
				}
			});
			// console.log({vechicleIds, customerIds})
			let VehicleDetails, CustomerDetails;
			await store.findVehicles({
				_id: {$in: (vechicleIds)}
			} , {
			})
				.then(vehicles => {
					// console.log({vehicles});
					VehicleDetails = vehicles;
				})
				.catch(err=> {
					console.error({err, requestBody: req.body});
					// logger.error({err, req});
				});
			await store.findCustomers({
				_id: {$in: (customerIds)}
			})
				.then(customers => {
					// console.log({customers});
					CustomerDetails = customers;
				})
				.catch(err=> {
					// logger.error({err, req});
					console.error({err, requestBody: req.body});
				});
			// console.log({CustomerDetails, VehicleDetails});
			// async.waterfall({
			//     one: function (callback){
			//
			//     }
			// })
			// for(let rc of runningContracts){
			//
			// }
			await async.eachLimit(runningContracts, 10,async (rc) => {
				let cpd;
				try{
					cpd = await _.find(CustomerDetails, (cd) => {
						return String(cd._id) === String(rc.customerProfileID);
					}) || null;
				} catch (e){
					// logger.error({e, req});
					console.log({e, req});
					cpd = null;
				}
				let vcd;
				try {
					vcd = await _.find(VehicleDetails, (vd) => {
						return String(vd._id) === String(rc.vehicleID);
					}) || null;
				} catch (e) {
					// logger.error({e, req});
					console.log({e, req});
					vcd = null;
				}

				if (cpd && cpd.verXResponses && cpd.verXResponses.length > 0) {
					const lastVerxResponse = cpd.verXResponses[cpd.verXResponses.length - 1];
					cpd.verXResponses = [lastVerxResponse];
				} else if (cpd && !cpd.verXResponses) {
					cpd.verXResponses = [];
				}

				rc.vehicleDetails = vcd;
				rc.customerProfileDetails = cpd;
			})
				.then(() => {
					return res.json({runningContracts});
				});
		})
		.catch(err => {
			// logger.error({err, req});
			console.error({err, requestBody: req.body});
			res.json({
				status: 'ERROR',
				err
			});
		});
};

exports.getStartedContractsWithinTimeRange = async (req, res) => {
	try {
		const { fromDate, toDate } = req.query;
		// let user = await User.findOne({_id: req.body.userId}, {dealershipID: 1});

		const from = Date.parse(fromDate);
		const to = Date.parse(toDate);

		const contracts = await store.findContracts(
			{ 
				// dealershipID: user.dealershipID,
				openTimeStamp: {$gte: from, $lte: to} 
			}
		);

		res.json({
			contracts
		});
	} catch (error) {
		// logger.error({error, req});
		console.error({error, req});
		res.json({
			status: 'ERROR',
			err: error,
		});
	}
};

exports.addTransaction = (req, res) => {
	let {contractID, transactionID, transactionObject, transactionAmount, transactionType} = req.body;
	let transaction = {
		transactionID,
		transactionType,
		transactionObject,
		transactionAmount
	};

	store.findOneContractAndUpdate({
		_id: contractID
	}, {
		$addToSet: {
			['transactions'] : transaction
		}
	}, {
		new: true,
		useFindAndModify: false,
		runValidators: true
	}, (err, contract) => {
		if (err) {
			return res.json({
				status: 'ERROR',
				err
			});
		}
		console.error({err, requestBody: req.body});
		return res.json({contract});
	});
};

exports.getContractsWithVehicle = (req, res) => {
	let {vehicleID} = req.query;
	store.findContracts({vehicleID, isCancelled: false})
		.then(contracts => {
			res.json({contractList: contracts});
		})
		.catch(err => {
			// logger.error({err, req});
			console.error({err, requestBody: req.body});
			res.json({
				status: 'ERROR',
				err
			});
		});

};

exports.getContractsPaginated = async (req, res) => {
	try {
		const pageNum = parseInt(req.query.pageNum);
		const pageSize = Constants.SERVER.PAGE_SIZE;

		// first get the contracts we are going to render on the page using skip + pagenumber etc
		let contracts = await store.getPaginatedContracts(pageNum, pageSize);

		// make a set for the customers and the vehicles, get their objects and map back to contract
		const customers = contracts
			.filter(contract => contract.customerProfileID !== 'RESERVATION')
			.map(contract => contract.customerProfileID);
		
		const vehicles = contracts.map(contract => contract.vehicleID);
		
		// after getting the contracts for this page, get customer objects
		const customerObjects = await store.findCustomers({_id: { $in: customers }}, null, {lean: true});

		// after getting the contracts for this page, get vehicle objects
		const vehicleObjects = await store.findVehicles({_id: { $in: vehicles }}, null, {lean: true});

		await async.eachLimit(contracts, 10, async (contract) => {
			let customer, vehicle;

			try {
				customer = await _.find(customerObjects, cd => {
					return String(cd._id) === String(contract.customerProfileID);
				}) || null;
			} catch (e) {
				console.error({e, req});
				customer = null;
			}

			try {
				vehicle = await _.find(vehicleObjects, vd => {
					return String(vd._id) === String(contract.vehicleID);
				}) || null;
			} catch (e) {
				console.error({e, req});
				vehicle = null;
			}

			if (customer && customer.verXResponses && customer.verXResponses.length > 0) {
				const lastVerxResponse = customer.verXResponses[customer.verXResponses.length - 1];
				customer.verXResponses = [lastVerxResponse];
			} else if (customer && !customer.verXResponses) {
				customer.verXResponses = [];
			}

			contract.vehicleDetails = vehicle;
			contract.customerProfileDetails = customer;
		});

		return res.json({
			contracts
		});

	} catch (error) {
		console.error({error, req});
		
		return res.json({
			status: 'ERROR',
			err: 'failed to return contracts'
		});
	}
};

exports.getNonReservationContracts = async (req, res) => {
	try {
		let contracts = await store.findContracts({contractType: {$ne: 'RESERVATION'}}, null, {lean: true});
		const vehicles = contracts.map(contract => contract.vehicleID);

		const vehicleObjects = await store.findVehicles({_id: { $in: vehicles }}, null, {lean: true});

		await async.eachLimit(contracts, 10, async (contract) => {
			let vehicle;

			try {
				vehicle = await _.find(vehicleObjects, vd => {
					return String(vd._id) === String(contract.vehicleID);
				}) || null;
			} catch (e) {
				console.error({e, req});
				vehicle = null;
			}

			contract.vehicleDetails = vehicle;
		});

		return res.json({
			contracts
		});
	} catch (error) {
		console.error({error, requestBody: req.body});
		return res.json({
			status: 'ERROR',
			err: 'Failed to get Non-Reservation Contracts',
			errObject: error
		});
	}
};

exports.calculateGasCharge = async (req, res) => {
	try {
		let {endingFuel, gasCharge, contractId} = req.body;

		const contract = await store.findContractById(contractId);

		if (isNaN(gasCharge)) {
			return res.json({
				err: 'Gas charge provided is not a number',
				status: 'ERROR'
			});
		}

		if (!contract) {
			return res.json({
				err: 'Could not find contract',
				status: 'ERROR'
			});
		}

		const vehicle = await store.findVehicleById(contract.vehicleID);

		if (!vehicle) {
			return res.json({
				err: 'Could not find vehicle',
				status: 'ERROR'
			});
		}

		if (!endingFuel) {
			const stats = await commonFunctions.getUpdatedVehicleStats(vehicle.QRLink);
			endingFuel = +stats.currentFuel;
		} else {
			endingFuel = commonFunctions.enumToPercent(endingFuel);
		}

		if (contract.fuelLabelStartPercentage < endingFuel) {
			return res.json({
				status: 'SUCCESS',
				charge: 0
			});
		} else {
			const fuelDifferenceInLiters = ((contract.fuelLabelStartPercentage - endingFuel) / 100) * vehicle.fuelTankSizeInLiters;
			const charge = fuelDifferenceInLiters * gasCharge;

			return res.json({
				status: 'SUCCESS',
				charge
			});
		}
	} catch (error) {
		return res.json({
			err: error,
			status: 'ERROR'
		});
	}
};

exports.getContractTransactionsById = async (req, res) => {
	let {contractID, vehicleID, customerProfileID} = req.query;
	if(!contractID || !vehicleID || !customerProfileID) {
		return res.json({err: 'Insufficient params provided'});
	}
	try {
		let transactions = await store.findContracts({
			_id: contractID,
			vehicleID,
			customerProfileID
		}, {transactions: 1});
		return res.json({transactions: transactions[0]});
	} catch (ex) {
		console.error({
			err: 'Error while fetching contract transactions: ' + JSON.stringify(ex, null, 2)
		});
		return res.json({err: ex, status: 'FAILURE'});
	}
};

exports.filterContractsByDate = async (req, res) => {
	try {
		const { pageNum, startDate, endDate, contractType } = req.query;

		const page = parseInt(pageNum);
		const pageSize = Constants.SERVER.PAGE_SIZE;


		const contracts = await store.getPaginatedContracts(page, pageSize, 
			{
				openTimeStamp: {$gte: startDate},
				closeTimeStamp: {$lte: endDate},
				contractType
			}
		);

		return res.json({
			status: 'SUCCESS',
			contracts
		});
	} catch (error) {
		console.error({error, requestBody: req.body});
		
		return res.json({
			status: 'ERROR',
			err: 'failed to return contracts',
			errObject: error
		});
	}
};
