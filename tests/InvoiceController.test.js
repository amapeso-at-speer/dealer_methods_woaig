const sinon = require('sinon');
const faker = require('faker');
const expect = require('chai').expect;
require('dotenv').config();

const User = require('../api/models/user.js');
const Contract = require('../api/models/contract.js');
const customerProfile = require('../api/models/customerProfile');
const Invoice = require('../api/models/invoice');
const ExpiredTokens = require('../api/models/expiredToken');
const BusinessHours = require('../api/models/busineesHours');
const Constants = require('../config/constants');
const Dealership = require('../api/models/dealership');
const DealershipHoliday = require('../api/models/dealershipHoliday');
const Vehicle = require('../api/models/vehicle');
const store = require('../api/store/store');
const InvoiceController = require('../api/controllers/invoiceController');
const commonFunctions = require('../config/commons');

const fs = require('fs');

/**
 * Notes:
 * Errors are printed in console because sendEmailWithInvoiceFails (Dont have credentials);
 * the expectation is that the invoices are created in the local directory.
 */

const testVehicle = {
	_id: faker.random.uuid(),
	status: faker.random.arrayElement(['AVAILABLE', 'UNAVAILABLE']),
	color: faker.vehicle.color(),
	statsUpdatedAt: faker.date.past(),
	QRLink: '88A102660039', 
	isDeleted: faker.random.arrayElement([true, false]),
	stockNumber: '0000' + faker.random.alphaNumeric(8),
	licensePlate: '0000' + faker.random.alphaNumeric(12),
	name: faker.vehicle.model(),
	odometerCountInMiles: faker.random.number(),
	vin: faker.vehicle.vin(),
	dailyRateCAD: faker.finance.amount(),
	make: faker.vehicle.manufacturer(),
	year: faker.random.number({min: 2010, max: 2021}),
	issues: [],
	notes: [],
	createdBy: faker.random.alphaNumeric(20),
	fuelVolume: faker.random.number({min: 0, max: 100}),
	batteryLevel: faker.random.arrayElement(['Good', 'Bad', 'Ok']),
	createdAt: faker.date.past(),
	updatedAt: faker.date.past(),
	vehicleNumber: faker.random.number(),
	toObject: function(){ return this; } // object is already plain javascript so function is here for faking purposes
};

const testContract = {
	fuelLabelStartPercentage: 12,
	vehicleID: '123801280523AFWEDFE',
	customerProfileID: '84650934852TRWTLK',
	contractType: 'SERVICE_LOANER',
	contractNumber: 1,
	openTimeStamp: Date.now(),
	closeTimeStamp: Date.now(),
	odometerReadingStart: 20,
	odometerReadingEnd: 22
};

const testCustomer = {
	firstName: 'TEST',
	lastName: 'TEST',
	scannedID: {
		address: 'ADDRESS'
	},
	emailAddress: 'test@test.com'
};

const testInvoice = {
	invoiceType: 'CONTRACTCLOSE',
	sid : '122590039',
	customerProfileID: '20984wjrasfjalskf',
	vehicleID: 'aoiuqr23451203984',
	contractID: 'sdfuqwopi523019823',
	charges: [{
		chargeName: 'Gas',
		chargeAmount: 30.00
	}, {
		chargeName: 'Odometer',
		chargeAmount: 5.00
	}],
	customerPayPercentage: 100 
};

const findVehicleByIdStub = sinon.stub(Vehicle, 'findById').returns({...testVehicle});
const findContractByIdStub = sinon.stub(Contract, 'findById').resolves({...testContract});
const findCustomerByIdStub = sinon.stub(customerProfile, 'findById').resolves({...testCustomer});
const createInvoiceStub = sinon.stub(store, 'createInvoice').resolves({...testInvoice});
const emailStub = sinon.stub(commonFunctions, 'sendEmailWithInvoiceAttachment').returns({});

const s3tobucketStub = sinon.stub(commonFunctions, 'uploadToS3Bucket')
	.resolves({
		Location: 'SOMEURL'
	});

const updateContractStub = sinon.stub(Contract, 'findOneAndUpdate')
	.resolves({
		...testContract,
		customerInvoicePdfLocation: 'SOME URL',
		internalInvoicePdfLocation: 'SOME OTHER URL'
	});

const s3Stub = sinon.stub(InvoiceController, 'storeInvoice')
	.returns(Promise.resolve({
		data: {
			Location: 'SOMEURL'
		}
	}));

describe('InvoiceController', () => {
	it('Should Create two invoices', (done) => {
		const mockReq = {
			query: {
				contractID: 'TEST'
			},
			body: {
				type: 'SPLIT',
				taxes: [{taxFor: 'Quebec Tax', taxRate: '13'}],
				customerInvoice: {
					days: 3,
					DailyRate: 12.50,
					addedCharges: [{
						chargeName: 'Gas',
						chargeAmount: 30.00
					}, {
						chargeName: 'Odometer',
						chargeAmount: 5.00
					}]
				},
				dealershipInvoice: {
					days: 3,
					DailyRate: 12.50
				}
			}
		};

		const mockRes = {
			json: function(obj) {
				console.log(obj);
				expect(obj.status).be.equal('SUCCESS');
				done();
			},
			send: function(obj) {
				console.log(obj);
				expect(obj.status).be.equal('SUCCESS');
				done();
			}
		};

		InvoiceController.sendInvoice(mockReq, mockRes);
	});
});