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
const Scheduler = require('../api/models/scheduler');
const DealershipHoliday = require('../api/models/dealershipHoliday');
const Vehicle = require('../api/models/vehicle');
const store = require('../api/store/store');
const contractController = require('../api/controllers/contractController');
const customerProfileController = require('../api/controllers/customerProfileController');
const commonFunctions = require('../config/commons');
const AMQService = require('../api/util/AMQService');
const amqlib = require('amqplib/callback_api');


describe('contractController', () => {
	// test for successful contract openning
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

	const testCustomer = {
		_id: faker.random.alphaNumeric(24),
		lastName: faker.name.lastName(),
		customerStatus: 'ACTIVE',
		lastAdditionalDriver: [
			{name: 'James Bond', driversLicenseNumber: 'xx-xx-xx'}
		],
		mobileNumber: faker.phone.phoneNumber(),
		email: faker.internet.email(),
		createdBy: faker.random.alphaNumeric(24),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};

	const testVehicle = {
		_id: faker.random.uuid(),
		status: faker.random.arrayElement(['AVAILABLE', 'UNAVAILABLE']),
		color: faker.vehicle.color(),
		statsUpdatedAt: faker.date.past(),
		QRLink: '88A102660049', //faker.random.alphaNumeric(12), 
		isDeleted: false,
		stockNumber: faker.random.alphaNumeric(12),
		licensePlate: faker.random.alphaNumeric(16),
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
		toObject: function() {return this; }
	};

	const testContract = {
		customerProfileID: testCustomer._id,
		vehicleID: testVehicle._id,
		createdBy: testUser._id,
		QRCode: testVehicle.QRLink,
		signatureImage: 'THISISASIGNATUREIMAGE',
		vehiclePickupTimeStamp: faker.date.future(),
		vehicleDropOffTimeStamp: faker.date.future(),
		serviceAdvisor: testUser._id,
		cardDetails: 'CARDDetails',
		cardExpiryDate: faker.date.future(),
		odometerReadingStart: faker.random.number(),
		fuelReadingStart: faker.random.arrayElement(['FULL_TANK', 'THREE_QUATERS', 'HALF_TANK', 'ONE_QUATER', 'LESS_THAN_A_QUATER']),
		additionalDriver: {name: 'James Bond', driversLicenseNumber: 'xx-xx-xx'},
		contractReferenceID: faker.random.hexaDecimal(),
		contractType: 'RENTAL',
		fuelLabelStartPercentage: 12,
	};
	const findVehicleByIdStub = sinon.stub(Vehicle, 'findById').resolves({...testVehicle});
	const findContractByIdStub = sinon.stub(Contract, 'findById').resolves({...testContract});
	const guidepointStub = sinon.stub(commonFunctions, 'getUpdatedVehicleStats')
		.resolves({ 
			currentFuel: '70', 
			batteryLevel: 'good', 
			currentOdometerinMiles: '100', 
			currentOdometerinKilometres: '200'
		});


	it('Should calculate gas charge WITH ENUM', (done) => {
		const mockReq = {
			body: {
				gasCharge: 12,
				endingFuel: 'HALF_TANK',
				contractId: '10980FASJFSDFLSJ',
				userId: '290348204802wserw',
			}
		};
		const mockRes = {
			json: function(obj) {
				expect(obj.status).to.equal('SUCCESS');
				done();
			}
		};
		contractController.calculateGasCharge(mockReq, mockRes);
	});

	//BELOW TEST WILL ONLY PASS IF THE MOCK VEHICLE MODEL ABOVE HAS A VALID ESN and guidepoint key is in env file
	it('Should calculate gas charge WITHOUT ENUM', (done) => {
		const mockReq = {
			body: {
				gasCharge: 12,
				contractId: '10980FASJFSDFLSJ',
				userId: '290348204802wserw',
			}
		};
		const mockRes = {
			json: function(obj) {
				expect(obj.status).to.equal('SUCCESS');
				done();
			}
		};
		contractController.calculateGasCharge(mockReq, mockRes);
	});

	it('create a contract', (done) => {
		const dealershipHolidayStub = sinon.stub(DealershipHoliday, 'findOne');
		const vehicleFindOneStub = sinon.stub(Vehicle, 'findOne');
		const vehicleUpdateStub = sinon.stub(Vehicle, 'findOneAndUpdate');
		const userStub = sinon.stub(User, 'findOne');
		const customerStub = sinon.stub(customerProfile, 'findOne');
		const customerupdatestub = sinon.stub(store, 'updateOneCustomer').resolves({});
		const contractUpdateStub = sinon.stub(store, 'createContract').resolves({...testContract});
		const getDocGenerationInfostub = sinon.stub(customerProfileController, 'getDocGenerationInfo')
			.resolves({
				customerDetail: {...testCustomer}, 
				vehicleDetail: {...testVehicle}, 
				contractDetail: {...testContract}
			});

		

		const amqstub = sinon.stub(AMQService, 'publishToQueue').resolves({});
		const amqlibstub = sinon.stub(amqlib, 'connect');

		sinon.stub(customerProfile, 'updateOne');	

		const vehicle = {...testVehicle};
		const user = {...testUser};
		const customer = {...testCustomer};
		const updatedVehicle = {...vehicle, status: 'UNAVAILABLE'};

		dealershipHolidayStub.resolves(null);
		userStub.resolves(user);
		customerStub.resolves(customer);
		vehicleFindOneStub.resolves(vehicle);
		vehicleUpdateStub.resolves(updatedVehicle);

		const mockReq = {
			body: {
				userId: testUser._id,
				customerID: customer._id, 
				vehicleID: vehicle._id,
				signatureImage: 's3Link',
				vehiclePickupTimeStamp: '2020-12-20',
				additionalDriver : [{
					'name' : 'James Bond the second',
					'driversLicenseNumber' : 'xx-xx-xx'
				}]
			}
		};

		const mockRes = {
			json: function(obj) {
				expect(obj.err).to.equal(null);
				done();
			},
			send: function(obj) {
				expect(obj.err).to.equal(null);
				done();
			}
		};

		contractController.openContract(mockReq, mockRes);
	});

	it('Should filter contracts by start and end date', async () => {
		const paginatedStub = sinon.stub(store, 'getPaginatedContracts').resolves([{...testContract}]);

		const mockReq = {
			query: {
				pageNum: '1',
				startDate: 'SOMEDATE',
				endDate: 'SOMEDATE',
				contractType: 'RENTAL'
			}
		};

		const mockRes = {
			json: obj => obj
		};

		const response = await contractController.filterContractsByDate(mockReq, mockRes);

		expect(response.status).to.equal('SUCCESS');
	});
});