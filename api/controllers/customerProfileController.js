const mongoose = require('mongoose');
const async = require('async');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const moment = require('moment-timezone');
const docxConverter = require('docx-pdf');
const fs = require('fs');
const path = require('path');
// const { logger } = require('../../config/common/log/logger');

const commonFunctions = require('../../config/commons');
const Constants = require('../../config/constants');

const store = require('../store/store');
const generateRentalContractEmail = require('../../config/emailTemplates/generateRentalContractEmail');

exports.createNewCustomer = (req, res) => {
	let customerDetail = req.body;

	store.createCustomer(customerDetail, req.body.userId)
		.then(resolve => {
			res.json({
				status: 'SUCCESS',
				payload: resolve._id
			});
			// commonFunctions.sendCustomerSignUpEmail(
			//     resolve.emailAddress,
			//     resolve.firstName + " " + resolve.lastName,
			//     (err, status) => {
			//         if(err){
			//             console.log(err);
			//         }
			//     }
			// )
		})
		.catch(reject => {
			const response = {
				status: 'ERROR',
				err: reject
			};
			console.log({reject, req});
			// logger.error({response, req});
			res.json(response);
		});
};

exports.editCustomerDetail = (req, res) => {
	let {customerProperties, customerProfileID} = req.body;
	// let crux = {
	//     // ...req.query.industry && {industry: {$regex: industry, $options: 'i'}},
	//     ...customerProperties.firstName && {firstName: customerProperties.firstName},
	//     ...customerProperties.lastName && {lastName: customerProperties.lastName},
	//     ...customerProperties.emailAddress && {emailAddress: customerProperties.emailAddress},
	//     ...customerProperties.lastAdditionalDriver && {lastAdditionalDriver: customerProperties.lastAdditionalDriver}
	// }
	// console.log({crux});
	store.findOneCustomerAndUpdate({_id: customerProfileID},
		{
			$set: customerProperties,
		}, {
			new: true
		},
		(err, opStatus) => {
			if (err) {
				console.error({err, requestBody: req.body});
				// 	logger.error({err, req});
				return res.json({
					status: 'ERROR',
					err
				});
			}
			// CustomerProfile
			//     .findByIdAndUpdate(
			//         customerProfileID, {
			//             $addToSet: {
			//                 editBy: "nom",
			//             },
			//         }, (err, opStatus) => {
			//             console.log(err, opStatus);
			//         }
			//     );
			return res.json({
				opStatus
			});
			// CustomerProfile.dropIndex({"test": 1});
		});
};

exports.getCustomers = (req, res) => {
	let {searchTerm} = req.query;
	if (commonFunctions.isNullOrUndefined(searchTerm) || searchTerm.length < 2) {
		return res.json({err: 'Search Term needs to have 2 characters at least'});
	}
	store.customerFuzzySearch(searchTerm, (err, results) => {
		if (err) {
			res.json({status: 'ERROR', err});
		}
		res.send({err, results});
	});
};


exports.getCustomers2 = (req, res) => {
	// let {searchTerm} = req.query;
	// if (commonFunctions.isNullOrUndefined(searchTerm) || searchTerm.length < 2) {
	//     return res.json({err: "Search Term needs to have 2 characters at least"});
	// }

	// console.log(searchTerm);
	store.customerFind300((err, results) => {
		// if (err) logger.error({err, req});
		if (err) {
			console.error({err, requestBody: req.body});
			return res.json({
				status: 'ERROR',
				err
			});
		}
		return res.send({err, results});
	});
};

exports.suspendCustomer = (req, res) => {
	store.findOneCustomerAndUpdate({_id: req.body.customerID}, {
		$set: {
			'customerStatus': 'SUSPENDED'
		}
	})
		.then(resolve => {
			return res.send({
				customerStatus: resolve.customerStatus
			});
		})
		.catch(err => {
			// logger.error({err, req});
			console.error({err, requestBody: req.body});
			return res.send({
				status: 'ERROR',
				err
			});
		});
};

exports.getCustomerByID = (req, res) => {
	let {customerID} = req.query;
	store.findOneCustomer({_id: customerID})
		.then(customerDetails => {
			res.json({customerDetails});
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

let mtz = () => {
	return moment.tz('America/Toronto');
};

let generateContractDoc = async (customerDetail, vehicleDetail, contractDetail) => {
	let content = fs
		.readFileSync(path.resolve(__dirname + '../../../config/contracts/GenesisDowntownRENTALAGREEMENT_master30jan2020.docx'), 'binary');
	let zip = new PizZip(content);
	let doc;
	try {
		doc = new Docxtemplater(zip);
	} catch (error) {
		errorHandler(error);
	}
	doc.setData({
		insurance_company_name : customerDetail.insurance.companyName || ' ',
		policy_number : customerDetail.insurance.insuranceNumber || ' ',
		vehicle_cost_pd : vehicleDetail.dailyRateCAD || ' ',
		today_date: mtz().format('DD/MM/YYYY HH:mm'),
		today_month: mtz().format('MMMM'),
		vehicle_name: vehicleDetail.name,
		vehicle_vin: vehicleDetail.vin,
		vehicle_stock_number: vehicleDetail.stockNumber,
		vehicle_odometer: vehicleDetail.odometerCountInMiles || ' ',
		vehicle_color: vehicleDetail.color ,
		vehicle_license: vehicleDetail.licensePlate,
		first_name: customerDetail.firstName,
		last_name: customerDetail.lastName,
		credit_card_details: contractDetail.cardDetails || ' ',
		credit_card_expiry_date: contractDetail.cardExpiryDate || ' ',
		customer_dl_number: customerDetail.scannedID.identificationNumber || ' ',
		customer_dl_expiry: customerDetail.scannedID.expirationDate || ' '
	});
	try {
		doc.render();
	} catch (error) {
		errorHandler(error);
		return false;
	}
	let buf = doc.getZip()
		.generate({type: 'nodebuffer'});
	await fs.writeFileSync(path.resolve(__dirname + '../../../config/contracts/', String(contractDetail._id + '.docx')), buf);
	return String(contractDetail._id + '.docx');
};

let generateContractDocUtil = async (emailID, licensePlate, contractID) => {
	// console.log({emailID});
	try {
		console.log({emailID});
		let customerDetail = await store.findOneCustomer({emailAddress: emailID});
		let vehicleDetail = await store.findOneVehicle({licensePlate});
		let contractDetail = await store.findContractById(contractID);
		console.log({customerDetail, vehicleDetail, contractDetail});
		let generatedDoc = await generateContractDoc({customerDetail}, {vehicleDetail}, {contractDetail});
		return generatedDoc;
	} catch (e) {
		console.log(e);
		return ({
			status: 'ERROR',
			err: e
		});
	}
};

exports.getDocGenerationInfo = async (emailID, licensePlate, contractID) => {
	let customerDetail = await store.findOneCustomer({emailAddress: emailID}, {verXResponses: 0});
	let vehicleDetail = await store.findOneVehicle({licensePlate});
	let contractDetail = await store.findContractById(contractID);
	return {customerDetail, vehicleDetail, contractDetail};
};

let generateContractDocUtilFromQueue = async (customerDetail, vehicleDetail, contractDetail) => {
	// console.log({emailID});
	try {
		return await generateContractDoc(customerDetail, vehicleDetail, contractDetail);
	} catch (e) {
		console.error(e);
		return ({
			status: 'ERROR',
			err: e
		});
	}
};

exports.generateDocUtil = generateContractDocUtil;

exports.sendStartContractEmail = async (customerDetail, vehicleDetail, contractDetail, callback) => {
	let contractName = await generateContractDocUtilFromQueue(customerDetail, vehicleDetail, contractDetail);
	console.log({contractName});

	let params = generateRentalContractEmail(customerDetail.emailAddress, contractDetail._id);
  
	commonFunctions.sendEmailWithContractAttachment(params, (err, resolve) => {
		callback(err, resolve);
	});
};

exports.convertDoc = (req, res) => {
	docxConverter( __dirname + '..\\..\\..\\config\\contracts\\GenesisDowntownRENTALAGREEMENT_master30jan2020.docx' ,
		__dirname + '..\\..\\..\\config\\contracts\\sample.pdf',
		(err, result) => {
			if (err) {
				res.json({status: 'ERROR', err});
			}
			return res.json({err, result});
		});
};

// The error object contains additional information when logged with JSON.stringify (it contains a properties object containing all suberrors).
function replaceErrors(key, value) {
	if (value instanceof Error) {
		return Object.getOwnPropertyNames(value).reduce(function(error, key) {
			error[key] = value[key];
			return error;
		}, {});
	}
	return value;
}

function errorHandler(error) {
	console.log(JSON.stringify({error: error}, replaceErrors));

	if (error.properties && error.properties.errors instanceof Array) {
		const errorMessages = error.properties.errors.map(function (error) {
			return error.properties.explanation;
		}).join('\n');
		console.error({errorMessages});
		// logger.error(errorMessages);
	}
	throw error;
}

exports.checkUniqueEmail = (req,res) => {
	let {emailAddress} = req.query;
	store.findOneCustomer({emailAddress: emailAddress}, null, null, (err, cst) => {
		if(err || cst != null){
			// logger.error({err, req});
			console.error({err, requestBody: req.body});
			res.send({
				status: 'ERROR',
				isEmailInUse: true,
				customerDetail: cst,
				err
			});
		} else {
			res.send({
				isEmailInUse: false
			});
		}
	});
};

exports.checkUniqueMobile = (req,res) => {
	let {mobileNumber} = req.query;
	store.findOneCustomer({mobileNumber: mobileNumber}, null, null, (err, cst) => {
		if(err || cst != null){
			// logger.error({err, req});
			console.error({err, requestBody: req.body});
			res.send({
				isMobileNumberInUse: true,
				customerDetail: cst
			});
		} else {
			res.send({
				isMobileNumberInUse: false
			});
		}
	});
};

exports.checkUniqueDL = (req,res) => {
	let {dl} = req.query;
	store.findOneCustomer({'scannedID.identificationNumber': dl}, null, null, (err, cst) => {
		if(err || cst != null){
			// logger.error({err, req});
			console.error({err, requestBody: req.body});
			res.send({
				status: 'ERROR',
				isDLInUse: true,
				customerDetail: cst,
				err
			});
		} else {
			res.send({
				isDLInUse: false
			});
		}
	});
};

exports.addVerxResponse = (req, res) => {
	let {customerProfileID, verxResponse} = req.body;
	let obj = {
		response: verxResponse
	};
	store.findOneCustomerAndUpdate({_id: customerProfileID}, {
		$addToSet: {['verXResponses']: obj}
	}, {
		new: true,
		useFindAndModify: false
	})
		.then(updatedCustomer => {
			return res.json({
				updated: updatedCustomer
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

exports.deleteCustomer = async (req, res) => {
	let {customerID} = req.query;
	const customerDetail = await store.findOneCustomer({_id: customerID});
	const currentEmail = customerDetail.emailAddress;
	const newEmail = currentEmail + '__PROFILE_DELETED_ON__' + moment(moment.now()).format('HH:mm:ss-MM/DD/YYYY').toString();
	store.findOneCustomerAndUpdate({_id: customerID}, {
		$set: {
			emailAddress: newEmail,
			isDeleted: true
		}
	}, {
		new: true,
		useFindAndModify: false
	})
		.then(updatedCustomer => {
			console.log('deleted customer id: ', updatedCustomer._id);
			return res.json({
				updated: updatedCustomer
			});
		})
		.catch(err => {
			console.error({err, requestBody: req.body});
			return res.json({
				status: 'ERROR',
				err
			});
		});

};
