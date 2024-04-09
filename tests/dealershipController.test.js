const sinon = require('sinon');
const faker = require('faker');
const expect = require('chai').expect;

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
const dealershipController = require('../api/controllers/dealershipController');

const testUser = {
	_id: faker.random.alphaNumeric(24),
	lastName: faker.name.lastName(),
	firstName: faker.name.firstName(),
	userRole: faker.random.arrayElement(['ADMIN', 'GENERAL_MANAGER', 'DIRECTOR', 'COORDINATOR']),
	first_time_login: faker.random.boolean(),
	passwordResetToken: null,
	isDeleted: faker.random.boolean(),
	email: faker.internet.email(),
	mobileNumber: faker.phone.phoneNumber(),
	password: faker.internet.password(),
	DealershipID: faker.random.alphaNumeric(24),
	createdAt: faker.date.past(),
	updatedAt: faker.date.past()
};

const findOneUserStub = sinon.stub(User, 'findOne').resolves({...testUser});
const findDealUpdateStub = sinon.stub(Dealership, 'findOneAndUpdate').resolves({});


describe('dealershipController', () => {
	it('Can toggle a tax preset', (done) => {
		const mockReq = {
			body: {
				taxPresetId: '5fd26b4e8b8fea35f8595877',
				userId: 'aaoi3iou41209809',
				value: false
			}
		};
		const mockRes = {
			json: function(obj) {
				expect(obj.status).to.equal('SUCCESS');
				done();
			}
		};
		dealershipController.toggleTaxPreset(mockReq, mockRes);
	});

	it('Can set odometer charge', (done) => {
		const mockReq = {
			body: {
				odometerKMCharge: 12,
				userId: 'aaoi3iou41209809',
			}
		};
		const mockRes = {
			json: function(obj) {
				expect(obj.status).to.equal('SUCCESS');
				done();
			}
		};
		dealershipController.setOdometerCharge(mockReq, mockRes);
	});

	it('Can set gas charge', (done) => {
		const mockReq = {
			body: {
				gasCharge: 12,
				userId: 'aaoi3iou41209809',
			}
		};
		const mockRes = {
			json: function(obj) {
				expect(obj.status).to.equal('SUCCESS');
				done();
			}
		};
		dealershipController.setGasCharge(mockReq, mockRes);
	});

	it('Can set free kilometers', (done) => {
		const mockReq = {
			body: {
				freeKilometers: 12,
				userId: 'aaoi3iou41209809',
			}
		};
		const mockRes = {
			json: function(obj) {
				expect(obj.status).to.equal('SUCCESS');
				done();
			}
		};
		dealershipController.setFreeKilometers(mockReq, mockRes);
	});

	it('Can set the warranty rate', (done) => {
		const mockReq = {
			body: {
				warrantyRate: 12,
				userId: 'aaoi3iou41209809',
			}
		};
		const mockRes = {
			json: function(obj) {
				expect(obj.status).to.equal('SUCCESS');
				done();
			}
		};
		dealershipController.setWarrantyRate(mockReq, mockRes);
	});

	it('Can set the PreAuthAmount', (done) => {
		const mockReq = {
			body: {
				preAuthPaymentAmount: 12,
				userId: 'aaoi3iou41209809',
			}
		};
		const mockRes = {
			json: function(obj) {
				expect(obj.status).to.equal('SUCCESS');
				done();
			}
		};
		dealershipController.setPreAuthAmount(mockReq, mockRes);
	});
});