const mongoose = require('mongoose');
const moment = require('moment');
const mtz = require('moment-timezone');
const Constants = require('../../config/constants');
// const { logger } = require('../../config/common/log/logger');
const _ = require('lodash');


const store = require('../store/store');

exports.setBusinessHours = async (req, res) => {
	let dealershipDetails = await store.findOneUser({_id: req.body.userId}, {dealershipID: 1});
	const dealershipId = dealershipDetails.dealershipID;
	if(!dealershipId){
		return res.json({
			status: 'ERROR',
			err: 'Invalid dealership id'
		});
	}
	let {dealershipStartTime, dealershipEndTime} = req.body;
	if(!dealershipEndTime || !dealershipStartTime){
		return res.statusCode(400).send({err: 'invalid params'});
	}
	store.findOneDealershipAndUpdate({
		_id: dealershipId
	}, {
		$set: {
			'businessHours' : {
				startTime: dealershipStartTime,
				endTime: dealershipEndTime
			}
		}
	}, {
		useFindAndModify: false,
		new: true
	}, (err, updatedDealership) => {
		// if (err) logger.error({err, req});
		if (err) {
			return res.json({
				status: 'ERROR',
				err
			});
		}
		console.error({err, requestBody: req.body});
		return res.json({
			err, updatedDealership
		});
	});
};

exports.addAdditionalFees = async (req, res) => {
	let {additionalFeeObject} = req.body;
	let dealershipDetails = await store.findOneUser({_id: req.body.userId}, {dealershipID: 1});
	const dealershipId = dealershipDetails.dealershipID;

	store.findOneDealershipAndUpdate({_id: dealershipId}, {
		$addToSet: {
			['additionalFeesPresets'] : additionalFeeObject
		}
	}, {
		useFindAndModify: false,
		new: true
	}, (err, st) => {
		// if (err) logger.error({err, req});
		if (err) {
			return res.json({status: 'ERROR', err});
		}
		console.error({err, requestBody: req.body});
		return res.json({err,
			updatedPresetFees: st.additionalFeesPresets});
	});
};

exports.addHolidayRange = async (req, res) => {
	try {
		const { userId, holidayStart, holidayEnd, description } = req.body;

		const dealershipDetails = await store.findOneUser({_id: userId}, {dealershipID: 1});
		const dealershipID = dealershipDetails.dealershipID;

		const proposedHolidays = dateRange(holidayStart, holidayEnd);

		const dealershipHolidays = await store.findOneDealershipHoliday({ dealershipID }, null, { lean: true });
		
		if (dealershipHolidays) {
			const currentHolidays = dealershipHolidays.holidays;

			const intersection = _.intersectionWith(proposedHolidays, currentHolidays, _.isEqual);

			if (intersection.length > 0) {
				return res.json({
					status: 'ERROR',
					err: 'Proposed holiday overlaps with existing holiday'
				});
			}
		}
		

		await store.findOneDealershipHolidayAndUpdate(
			{ dealershipID },
			{ $addToSet: { holidays: proposedHolidays } },
			{
				new: true,
				useFindAndModify: false,
				upsert: true
			}
		);

		const dealership = await store.findOneDealershipAndUpdate(
			{_id: dealershipID},
			{ $addToSet: { holidays: { start: holidayStart, end: holidayEnd, description } } },
			{
				new: true,
				useFindAndModify: false,
				upsert: true
			}
		);

		res.json({
			holidays: dealership.holidays
		});

	} catch (error) {
		// logger.error({error, req});
		console.error({error, req});
		res.json({
			status: 'ERROR',
			err: error
		});
	}
};

exports.removeHolidayRange = async (req, res) => {
	try {
		const { userId, holidayID } = req.body;

		const dealershipDetails = await store.findOneUser({_id: userId}, {dealershipID: 1});
		const dealershipID = dealershipDetails.dealershipID;


		const dealershipHoliday = await store.findOneDealership(
			{ '_id': dealershipID, 'holidays._id': holidayID },
			{ 'holidays.$': 1, '_id': 0 }
		);

		const holidayStart = dealershipHoliday.holidays[0].start;
		const holidayEnd = dealershipHoliday.holidays[0].end;

		const start = Date.parse(holidayStart);
		const end = Date.parse(holidayEnd);

		const dealership = await store.findOneDealershipAndUpdate(
			{ _id: dealershipID },
			{ $pull: { holidays: { _id: holidayID } } },
			{ new: true, useFindAndModify: false, upsert: true }
		);

		await store.findOneDealershipHolidayAndUpdate(
			{ dealershipID },
			{ $pull: { holidays: { $gte: start, $lte: end } } },
			{ new: true, upsert: true },
		);

		res.json({
			holidays: dealership.holidays
		});
	} catch (error) {
		// logger.error({error, req});
		console.error({error, req});
		res.json({
			status: 'ERROR',
			err: error
		});
	}
};

exports.addHoliday = async (req, res) => {
	try {
		const { userId, holiday } = req.body;

		const dealershipDetails = await store.findOneUser({_id: userId}, {dealershipID: 1});
		const dealershipID = dealershipDetails.dealershipID;

		const dealershipHolidays = await store.findOneDealershipHolidayAndUpdate(
			{ dealershipID },
			{ $addToSet: { holidays: holiday } },
			{
				new: true,
				useFindAndModify: false,
				upsert: true
			}
		);

		res.json({
			dealershipHolidays
		});

	} catch (error) {
		// logger.error({error, req});
		console.error({error, req});
		res.json({
			status: 'ERROR',
			err: error
		});
	}
};

exports.removeHoliday = async (req, res) => {
	try {
		const { userId } = req.body;
		const { date } = req.params;

		const dealershipDetails = await store.findOneUser({_id: userId}, {dealershipID: 1});
		const dealershipID = dealershipDetails.dealershipID;

		const dealershipHolidays = await store.findOneDealershipHolidayAndUpdate(
			{ dealershipID },
			{ $pull: { holidays: date } },
			{
				new: true,
				useFindAndModify: false,
				upsert: true
			}
		);

		res.json({
			dealershipHolidays
		});
	} catch (error) {
		// logger.error({error, req});
		console.error({error, req});
		res.json({
			status: 'ERROR',
			err: error
		});
	}
};

exports.getHolidays = async (req, res) => {
	try {
		const { userId } = req.body;
		const dealershipDetails = await store.findOneUser({_id: userId}, {dealershipID: 1});
		const dealershipID = dealershipDetails.dealershipID;
    
		const dealership = await store.findOneDealership({_id: dealershipID}, { holidays: 1, dealershipID: 1});
    
		return res.json({
			holidays: dealership.holidays
		});
	} catch (error) {
		// logger.error({error, req});
		console.error({error, req});
		res.json({
			status: 'ERROR',
			err: error
		});
	}
};

exports.deleteAdditionalFees = async (req, res) => {
	let dealershipDetails = await store.findOneUser({_id: req.body.userId}, {dealershipID: 1});
	const dealershipId = dealershipDetails.dealershipID;
	let {presetFeeID} = req.query;
	store.findOneDealershipAndUpdate(
		{_id: dealershipId},
		{
			$pull: {['additionalFeesPresets'] : {_id: presetFeeID}}
		},
		{
			new: true,
			useFindAndModify: false
		}
	)
		.then(dealershipObj => {
			return res.json({
				presetFees: dealershipObj.additionalFeesPresets
			});
		})
		.catch(err => {
			// logger.error({err, req});
			console.error({err, requestBody: req.body});
			return res.json({
				status: 'ERROR',
				err,
			});
		});
};


exports.addTaxPresets = async (req, res) => {
	let {taxPreset} = req.body;
	let dealershipDetails = await store.findOneUser({_id: req.body.userId}, {dealershipID: 1});
	const dealershipId = dealershipDetails.dealershipID;
	store.findOneDealershipAndUpdate({_id: dealershipId}, {
		$addToSet: {
			['taxPresets'] : taxPreset
		}
	}, {
		useFindAndModify: false,
		new: true
	}, (err, st) => {
		// if (err) logger.error({err, req});
		if (err) console.error({err, requestBody: req.body});
		return res.json({
			err,
			updatedTaxPresets: st.taxPresets
		});
	});
};

exports.toggleTaxPreset = async (req, res) => {
	try {
		const {taxPresetId, value} = req.body;

		let userDetails = await store.findOneUser({_id: req.body.userId}, {dealershipID: 1});
		const dealershipId = userDetails.dealershipID;

		await store.findOneDealershipAndUpdate(
			{_id: dealershipId, 'taxPresets._id': taxPresetId},
			{
				$set: {
					'taxPresets.$.toggle': value
				}
			}, {
				useFindAndModify: false,
				new: true,
				upsert: true
			}
		);

		return res.json({
			status: 'SUCCESS'
		});
	} catch (error) {
		console.error({error, requestBody: req.body});
		return res.json({
			status: 'ERROR',
			err: error
		});
	}
};


exports.deleteTaxPreset = async (req, res) => {
	let dealershipDetails = await store.findOneUser({_id: req.body.userId}, {dealershipID: 1});
	const dealershipId = dealershipDetails.dealershipID;
	let {presetTaxID} = req.query;
	store.findOneDealershipAndUpdate(
		{_id: dealershipId},
		{
			$pull: {['taxPresets'] : {_id: presetTaxID}}
		},
		{
			new: true,
			useFindAndModify: false
		}
	)
		.then(dealershipObj => {
			return res.json({
				updatedTaxPresets: dealershipObj.taxPresets
			});
		})
		.catch(err => {
			// logger.error({err, req});
			console.error({err, requestBody: req.body});
			return res.json({
				status: 'ERROR',
				err
			});
		});
};

exports.verXCallRecord = async (req, res) => {
	let {userId} = req.body;
	let {licenseNumber} = req.query;
	if(licenseNumber === null || licenseNumber === undefined) {
		return res.json({
			status: 'ERROR',
			err: 'invalid request'
		});
	}
	let dealershipDetails = await store.findOneUser({_id: req.body.userId}, {dealershipID: 1});
	store.updateOneDealership({
		_id: dealershipDetails.dealershipID
	}, {
		$addToSet: {
			verXCallLog: {
				createdBy: userId,
				licenseNumber: licenseNumber
			}
		}
	}, (err, upstatus) => {
		// if (err) logger.error({err, req});
		if (err) {
			console.error({err, requestBody: req.body});
			return res.json({
				status: 'ERROR',
				err
			});
		}
		return res.json({err, upstatus});
	});
};

function dateRange(startDate, endDate) {
	const dateArray = [];
	let currentDate = new Date(startDate);

	while (currentDate <= new Date(endDate)) {
		dateArray.push(new Date(currentDate));

		currentDate.setUTCDate(currentDate.getUTCDate() + 1);
	}
	return dateArray;

}

exports.unfreezeEmployee = (req, res) => {
	let {userIDtoUnfreeze} = req.body;
	store.findOneUserAndUpdate({_id: userIDtoUnfreeze}, {
		$set: {['isDeleted']: false}
	}, {new: true})
		.then(user => {
			return res.json({user});
		})
		.catch(err => {
			console.error({err, requestBody: req.body});
			// logger.error({err, req});
			return res.status(400).send({
				status: 'ERROR',
				err
			});
		});
};

exports.setOdometerCharge = async (req, res) => {
	try {
		const { odometerKMCharge, userId } = req.body;
		const userDetails = await store.findOneUser({_id: userId}, {dealershipID: 1});

		if (odometerKMCharge && !isNaN(odometerKMCharge)) {
			const dealership = await store.findOneDealershipAndUpdate(
				{_id: userDetails.dealershipID},
				{
					$set: {
						['odometerKMCharge']: odometerKMCharge
					}
				},
				{upsert: true, new: true}
			);
	
			return res.json({
				status: 'SUCCESS',
				dealership
			});  
		} else {
			return res.json({
				status: 'ERROR',
				err: 'Odometer Km charge is not a number'
			});
		}
	} catch (error) {
		console.error(error, req.body);
		return res.json({
			err: error.toString(),
			status: 'ERROR'
		});
	}
};

exports.setGasCharge = async (req, res) => {
	try {
		const { gasCharge, userId } = req.body;
		const userDetails = await store.findOneUser({_id: userId}, {dealershipID: 1});

		if (gasCharge && !isNaN(gasCharge)) {
			const dealership = await store.findOneDealershipAndUpdate(
				{_id: userDetails.dealershipID},
				{
					$set: {
						['gasCharge']: gasCharge
					}
				},
				{upsert: true, new: true}
			);
	
			return res.json({
				status: 'SUCCESS',
				dealership
			});
		} else {
			return res.json({
				status: 'ERROR',
				err: 'Gas charge is not a number'
			});
		}
	} catch (error) {
		console.error(error, req.body);
		return res.json({
			err: error.toString(),
			status: 'ERROR'
		});
	}
};

exports.setFreeKilometers = async (req, res) => {
	try {
		const { freeKilometers, userId } = req.body;
		const userDetails = await store.findOneUser({_id: userId}, {dealershipID: 1});

		if (freeKilometers && !isNaN(freeKilometers)) {
			const dealership = await store.findOneDealershipAndUpdate(
				{_id: userDetails.dealershipID},
				{
					$set: {
						['freeKilometers']: freeKilometers
					}
				},
				{upsert: true, new: true}
			);
	
			return res.json({
				status: 'SUCCESS',
				dealership
			});
		} else {
			return res.json({
				status: 'ERROR',
				err: 'Free kilometers is not a number'
			});
		}
	} catch (error) {
		console.error(error, req.body);
		return res.json({
			err: error.toString(),
			status: 'ERROR'
		});
	}
};

exports.setWarrantyRate = async (req, res) => {
	try {
		const { warrantyRate, userId } = req.body;
		const userDetails = await store.findOneUser({_id: userId}, {dealershipID: 1});

		if (warrantyRate && !isNaN(warrantyRate)) {
			const dealership = await store.findOneDealershipAndUpdate(
				{_id: userDetails.dealershipID},
				{
					$set: {
						['warrantyRate']: warrantyRate
					}
				},
				{upsert: true, new: true}
			);
	
			return res.json({
				status: 'SUCCESS',
				dealership
			});
		} else {
			return res.json({
				status: 'ERROR',
				err: 'Warranty rate is not a number'
			});
		}
	} catch (error) {
		console.error(error, req.body);
		return res.json({
			err: error.toString(),
			status: 'ERROR'
		});
	}
};

exports.setPreAuthAmount = async (req, res) => {
	try {
		const { preAuthPaymentAmount, userId } = req.body;
		const userDetails = await store.findOneUser({_id: userId}, {dealershipID: 1});

		if (preAuthPaymentAmount && !isNaN(preAuthPaymentAmount)) {
			const dealership = await store.findOneDealershipAndUpdate(
				{_id: userDetails.dealershipID},
				{
					$set: {
						['preAuthPaymentAmount']: preAuthPaymentAmount
					}
				},
				{upsert: true, new: true}
			);
	
			return res.json({
				status: 'SUCCESS',
				dealership
			});
		} else {
			return res.json({
				status: 'ERROR',
				err: 'Pre-authorized payment amount is not a number'
			});
		}
	} catch (error) {
		console.error(error, req.body);
		return res.json({
			err: error.toString(),
			status: 'ERROR'
		});
	}
};