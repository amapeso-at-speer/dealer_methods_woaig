const mongoose = require('mongoose'),
	moment = require('moment-timezone'),
	Constants = require('../../config/constants'),
	ejs = require('ejs'),
	_ = require('lodash'),
	path = require('path');
// const User = mongoose.model('User');
// const Contract = mongoose.model('Contract');
// const CustomerProfile = mongoose.model('CustomerProfile');
// const Vehicle = mongoose.model('Vehicle');
// const Invoice = mongoose.model('Invoice');
const store = require('../store/store');
const { logger } = require('../../config/common/log/logger');



const vechicleController = require('../controllers/vehicleController');
const customerProfileController = require('../controllers/customerProfileController');

const async = require('async');
let commonFunctions = require('../../config/commons');
const fs = require('fs');
const pdf = require('html-pdf');
const generateContractSummaryEmail = require('../../config/emailTemplates/generateContractSummaryEmail');

let fetchAllData = async (params) => {
	let {vehicleID, customerID, contractID} = params;
	if(!vehicleID || !customerID || !contractID) {
		return false;
	}

	const details = await async.parallel({
		vehicleDetails: function (callback) {
			store.findVehicleById(vehicleID, null, null, (err, vehicle) => {
				callback(null, vehicle);
			});
		},
		customerDetails: function (callback) {
			store.findCustomerById(customerID, null, null, (err, customer) => {
				callback(null, customer);
			});
		},
		contractDetails: function (callback) {
			store.findContractById(contractID, null, (err, contract) => {
				callback(null, contract);
			});
		}
	}).catch(err => console.error(err));

	let {addedCharges} = params;

	if(addedCharges) {
		details.addedCharges = addedCharges;
	} else {
		details.addedCharges = null;
	}

	details.days = params.days;
	details.dailyRate = params.dailyRate;
	details.taxes = params.taxes;
	
	return details;
};


function fetchInvoiceBoilerPlate(callback) {
	let ejs = fs.readFileSync(__dirname + '/../../config/invoice/initial_invoice/invoice.ejs', 'utf8');
	callback(ejs);
}

// fetchInvoiceBoilerPlate(params, async (boilerPlate) => {
//     let filledParams = {...params, ...details};
//     let options = {
//         format: 'Letter',
//     };
//     // pdf.create(boilerPlate, options).toFile( __dirname + '/../../config/invoice/created_invoices/' + params.contractID + '.pdf', function(err, res) {
//     //     if (err)
//     //         return console.log(err);
//     //     callback(res);
//     // });
//     // callback(filledParams);
// })

async function createInvoice(params, charges) {
	return await store.createInvoice(params, charges)
		.catch(err => {
			console.error({err});
			// logger.error(err);
		});
}

async function calculateCharges(details) {
	let charges = {
		base: 0,
		tollFee: 0,
	};
	let {addedCharges} = details;
	if(details.miscCharge){
		charges.miscCharge = details.miscCharge;
	}
	let addedChargeAmounts = _.map(addedCharges, 'chargeAmount');
	// console.log({details});
	// let {dailyRateCAD} = details.vehicleDetails,
	// 	{openTimeStamp, closeTimeStamp} = details.contractDetails;
	// let openTimeStampMoment = moment(openTimeStamp), closeTimeStampMoment = moment(closeTimeStamp);
	const days = details.days;
	const dailyRateCAD = details.dailyRate;

	// charges.base = (dailyRateCAD * days);
	charges.base = (dailyRateCAD * days);
	charges.tollFee = 0;
	// callback(charges);

	charges.addedCharges = addedCharges;
	let arrOfCosts = _.values(charges);
	arrOfCosts = arrOfCosts.concat(addedChargeAmounts);

	const total = await new Promise((res, rej) => {
		let total = 0;
		for (let val of arrOfCosts) {
			if (val && Number.isFinite(val)) {
				total += val;
			}
		}
		charges.preTax = total;
		res(total);
	});
	
	const result = await new Promise((res, rej) => {
		let customerPayableAmountPreTax = total;
		charges.customerPayableAmountPreTax = customerPayableAmountPreTax;
		charges.dailyRate = dailyRateCAD;

		let result = Math.round((1.00 * customerPayableAmountPreTax) * 1e2) / 1e2;

		res(result);
	});

	let totalTax = 0;
	details.taxes.forEach(tax => {
		totalTax = totalTax + ((tax.taxRate/100) * result);
	});
	charges.postTax = Math.round((1.00 * (result + totalTax)) * 1e2) / 1e2;

	//make sure addecharges are 2 decimals
	charges.addedCharges = charges.addedCharges.map(charge => {
		charge.chargeAmount = charge.chargeAmount.toFixed(2);
		return charge;
	});

	charges.totalTax = totalTax;

	return charges;
}

async function generateInvoice(params) {
	const details = await fetchAllData(params);
	const chargeData = await calculateCharges(details);
	const inv = await createInvoice(params, chargeData);

	return {params, details, chargeData, inv};
}

async function generateInvoicePDF(information, type, percent) {
	let invoiceInfo = {
		invShortID: information.details.contractDetails.contractNumber || ' ',
		invCreatedAt: mtz(information.inv.createdAt).format('L') || ' ',
		invDueAt: mtz(information.inv.createdAt).format('L') || ' ',
		customerName: information.details.customerDetails.firstName + ' ' + information.details.customerDetails.lastName || ' ',
		customerAddress: information.details.customerDetails.scannedID.address || ' ',
		customerEmail: information.details.customerDetails.emailAddress || ' ',
		licensePlate: information.details.vehicleDetails.licensePlate|| ' ',
		odometerReadingStart: information.details.contractDetails.odometerReadingStart || ' ',
		odometerReadingEnd: information.details.contractDetails.odometerReadingEnd || ' ',
		modelNumber: information.details.vehicleDetails.name || ' ',
		dailyRate: information.chargeData.dailyRate || ' ',
		contractDuration: String(mtz(information.details.contractDetails.openTimeStamp).format('L') + ' to ' +
                            mtz(information.details.contractDetails.closeTimeStamp).format('L')),
		stockNumber: information.details.vehicleDetails.stockNumber,
		fuelIn: information.details.contractDetails.fuelLabelStartPercentage || 300,
		fuelOut: information.details.contractDetails.fuelLabelEndPercentage || 200,
		vinNumber: information.details.vehicleDetails.vin,
		//DISCUSS CATEGORY
		vehicleCategory: information.details.vehicleDetails.category || 'SUV',
		vehicleColor: information.details.vehicleDetails.color,
		vehicleIssues: 'NONE',
		customerPayPercentage: percent
	};
	// console.log({invoiceInfo});
	if(information && information.details && information.details.contractDetails && information.details.contractDetails.cardDetails
     && information.details.contractDetails.cardDetails.includes('****')){
		invoiceInfo.paymentMethod = 'CARD PAYMENT';
		invoiceInfo.cardNumber = information.details.contractDetails.cardDetails;
	} else {
		invoiceInfo.paymentMethod = 'POS';
		invoiceInfo.cardNumber = 'N/A';
	}

	if (type === InvoiceType.INTERNAL) {
		invoiceInfo.type = 'DEALERSHIP INVOICE';
	} else if (type === InvoiceType.CUSTOMER) {
		invoiceInfo.type = 'CUSTOMER INVOICE';
	}

	
	invoiceInfo.chargeData = information.chargeData;

	invoiceInfo.chargeData.base = information.chargeData.base.toFixed(2);
	invoiceInfo.chargeData.preTax = invoiceInfo.chargeData.preTax.toFixed(2);
	invoiceInfo.chargeData.customerPayableAmountPreTax = invoiceInfo.chargeData.customerPayableAmountPreTax.toFixed(2);

	const generatedHtml = await ejs.renderFile(path.join(__dirname, '/../../config/invoice/initial_invoice/invoice.ejs'), {invoiceInfo: invoiceInfo});

	let fileName = invoiceInfo.invShortID + Date.now() + '.pdf';
	let options = {};

	const data = await new Promise((res, rej) => {
		pdf.create(generatedHtml, options).toFile(__dirname + '/../../config/invoice/created_invoices/' + fileName, (err, data) => {
			if(err)  {
				console.error(err);
				rej(err);
			}
			return res(data);
		});
	});

	return {data, fileName};
}

exports.sendInvoice = (req, res) => {
	const {contractID} = req.query;
	let {type, customerInvoice, dealershipInvoice, taxes } = req.body;
	
	store.findContractById(contractID)
		.then(async contract => {
			if(!contract || !contract.closeTimeStamp) {
				return res.json({
					status: 'ERROR',
					err: 'Contract not closed yet'
				});
			}
			
			if (contract.internalInvoicePdfLocation || contract.customerInvoicePdfLocation) {
				return res.json({
					status: 'SUCCESS',
					contract
				});
			}

			if (contract.contractType === 'SERVICE_LOANER') {
				customerInvoice.DailyRate = 0;
			}

			if (type === 'BILL') {

				let params = {
					contractID,
					vehicleID: contract.vehicleID,
					customerID: contract.customerProfileID,
					addedCharges: customerInvoice.addedCharges,
					days: customerInvoice.days,
					dailyRate: customerInvoice.DailyRate, 
					taxes
				};
				
				const customerPdf = await makeInvoice(params, InvoiceType.CUSTOMER, 100);
				const customerPdfS3Data = await storeInvoice(customerPdf);

				const updatedContract = await updateContractPdfLinks(contractID, customerPdfS3Data.data.Location);

				return res.json({
					status: 'SUCCESS',
					contract: updatedContract,
				});

			} else if (type === 'SPLIT') {

				let customerParams = {
					contractID,
					vehicleID: contract.vehicleID,
					customerID: contract.customerProfileID,
					addedCharges: customerInvoice.addedCharges,
					days: customerInvoice.days,
					dailyRate: customerInvoice.DailyRate,
					taxes
				};

				let dealershipParams = {
					contractID,
					vehicleID: contract.vehicleID,
					customerID: contract.customerProfileID,
					addedCharges: dealershipInvoice.addedCharges,
					days: dealershipInvoice.days,
					dailyRate: dealershipInvoice.DailyRate,
					taxes
				};
				const totalDays = dealershipInvoice.days + customerInvoice.days;
				const customerPayPercentage = (customerInvoice.days / totalDays) * 100;
				const internalPayPercentage = 100 - customerPayPercentage;

				// generate invoice pdfs
				const [customerPdf, dealershipPdf] = await Promise.all([
					makeInvoice(customerParams, InvoiceType.CUSTOMER, customerPayPercentage), 
					makeInvoice(dealershipParams, InvoiceType.INTERNAL, internalPayPercentage)
				]);
				
				// upload pdfs to s3
				const [customerPdfS3Data, dealershipPdfData] = await Promise.all([
					storeInvoice(customerPdf),
					storeInvoice(dealershipPdf)
				]);

				// put in contract
				const updatedContract = await updateContractPdfLinks(contractID, customerPdfS3Data.data.Location, dealershipPdfData.data.Location);

				return res.json({
					status: 'SUCCESS',
					contract: updatedContract
				});

			} else {
				return res.json({
					status: 'ERROR',
					err: 'Please provide proper split enum'
				});
			}
		}).catch(err => {
			console.error({err, requestBody: req.body});
			// logger.error({err, req});
			return res.send({status:'ERROR', err: err});
		});
};

async function updateContractPdfLinks(ContractID, customerInvoicePdfLocation, internalInvoicePdfLocation) {
	if (internalInvoicePdfLocation) {
		return await store.findOneContractAndUpdate(
			{_id: ContractID}, 
			{
				lastCustomerInvoiceEmail: moment().tz('America/Toronto'), 
				customerInvoicePdfLocation, 
				internalInvoicePdfLocation
			}, 
			{new: true});
	} else {
		return await store.findOneContractAndUpdate(
			{_id: ContractID}, 
			{
				lastCustomerInvoiceEmail: moment().tz('America/Toronto'), 
				customerInvoicePdfLocation
			}, 
			{new: true});
	}
}

async function makeInvoice(params, type, percent) {
	const invoice = await generateInvoice(params);
	const pdfPath = await generateInvoicePDF(invoice, type, percent);
	
	//If it is the customer invoice send it in an email
	if (type === InvoiceType.CUSTOMER) {
		let params = generateContractSummaryEmail(invoice.details.customerDetails.emailAddress, pdfPath.fileName);
		commonFunctions.sendEmailWithInvoiceAttachment(params, (err, resolve) => {
			// if (err) logger.error({err, req});
			if (err) console.error({err});
		});
	}

	return pdfPath;
}

const storeInvoice = async function(pdfPath) {
	try {
		const data = await commonFunctions.uploadToS3Bucket('dealer-methods-toronto', pdfPath.data.filename, 'invoices/'+ pdfPath.fileName)

		console.log(`File uploaded to s3 successfully. ${data.Location}`);

		return {data};
	} catch (err) {
		console.error({err});
		throw err;
	}
};

exports.storeInvoice = storeInvoice;



const InvoiceType = {
	CUSTOMER: 'CUSTOMER',
	WARRANTY: 'WARRANTY',
	INTERNAL: 'INTERNAL',
};


let mtz = (time) => {
	return moment(time).tz('America/Toronto');
};


// exports.mtz = mtz;
