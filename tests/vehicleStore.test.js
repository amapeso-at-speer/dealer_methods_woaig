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
const { expectation } = require('sinon');

// TODO: WRITE TESTS WHERE WE PASS IN PROJECTION

describe('vehicleStore', () => {
	const vehiclesTest = [{
		_id: faker.random.uuid(),
		status: faker.random.arrayElement(['AVAILABLE', 'UNAVAILABLE']),
		color: faker.vehicle.color(),
		statsUpdatedAt: faker.date.past(),
		QRLink: faker.random.alphaNumeric(12), 
		isDeleted: faker.random.arrayElement([true, false]),
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
		vehicleNumber: faker.random.number()
	},
	{
		_id: faker.random.uuid(),
		status: faker.random.arrayElement(['AVAILABLE', 'UNAVAILABLE']),
		color: faker.vehicle.color(),
		statsUpdatedAt: faker.date.past(),
		QRLink: faker.random.alphaNumeric(12), 
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
		vehicleNumber: faker.random.number()
	},
	{
		_id: faker.random.uuid(),
		status: faker.random.arrayElement(['AVAILABLE', 'UNAVAILABLE']),
		color: faker.vehicle.color(),
		statsUpdatedAt: faker.date.past(),
		QRLink: faker.random.alphaNumeric(12), 
		isDeleted: faker.random.arrayElement([true, false]),
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
		vehicleNumber: faker.random.number()
	}];

	let findStub;
	before(() => {
		findStub = sinon.stub(Vehicle, 'find');
	});

	after(() => {
		sinon.reset();
	});

	it('Should grab a list of vehicles; non of which should have empty string of quad zeros in fields', async () => {
		findStub.resolves([...vehiclesTest]);
		const _vehicles =  await store.findVehicles(null,null, {lean: true});

		// expect(findStub.calledOnce).to.be.true;

		_vehicles.forEach(v => {
			expect(v.stockNumber.startsWith('0000')).to.be.false;
			expect(v.licensePlate.startsWith('0000')).to.be.false;
		});
	});

	it('Should find one vehicle and update', async () => {
		const originalVehicle = vehiclesTest[0];
		const updatedVehicle = Object.assign({}, originalVehicle);

		let update;
		if (originalVehicle.status === 'AVAILABLE') {
			update = 'UNAVAILABLE';
		} else {
			update = 'AVAILABLE';
		}
		updatedVehicle.status = update;

		const criteriaObject = {_id: originalVehicle._id};
		const updateObject = {status: update};
		const optionsObject = {lean: true, new: true};
		
		const stub = sinon.stub(Vehicle, 'findOneAndUpdate').resolves(updatedVehicle);

		const vehicle = await store.findOneVehicleAndUpdate(criteriaObject, updateObject, optionsObject);

		expect(stub.calledOnce, 'stub called once').to.be.true;
		expect(['AVAILABLE', 'UNAVAILABLE'], 'value is either value of this enums').to.include(vehicle.status);
		expect(vehicle.status, 'Expect vehicle to have a different status').to.be.not.equal(originalVehicle.status);
	});

	it('Should find a vehicle by ID', async () => {
		const vehicle = vehiclesTest[1];

		const stub = sinon.stub(Vehicle, 'findById').resolves(vehicle);

		const response  = await store.findVehicleById(vehicle._id, null, {lean: true});


		expect(stub.calledOnce, 'stub called once').to.be.true;
		expect(response.stockNumber.startsWith('0000'), 'Expect vehicle stockNumber to not start with quadruple zeros').to.be.false;
		expect(response.licensePlate.startsWith('0000'), 'Expect vehicle licensePlate to not start with quadruple zeros').to.be.false;
		expect(response._id).to.be.equal(vehicle._id);
	});

	it('Should find one vehicle by Id', async () => {
		const vehicle = vehiclesTest[0];

		const stub = sinon.stub(Vehicle, 'findOne').resolves(vehicle);

		const response = await store.findOneVehicle({_id: vehicle._id}, null, {lean: true});

		expect(stub.calledOnce, 'stub to be called once').to.be.true;
		expect(response._id).to.be.equal(vehicle._id);
		expect(response.stockNumber.startsWith('0000'), 'Expect vehicle stockNumber to not start with quadruple zeros').to.be.false;
		expect(response.licensePlate.startsWith('0000'), 'Expect vehicle licensePlate to not start with quadruple zeros').to.be.false;
	});

	// This test will fail.
	it('Should produce projection on the node.js side instead of mongodb side', async () => {
		findStub.resolves([...vehiclesTest]);
		const projection = {status: 1, color: true, _id: 0};
		const options = {lean: true};

		const projectedVehicles = await store.findVehicles(null, projection, options);

		projectedVehicles.forEach(vehicle => {
			expect(vehicle).to.not.have.property('_id');
			expect(vehicle).to.have.property('status');
			expect(vehicle).to.have.property('color');
		});
	});

	it('Should produce a projection on that excludes fields', async () => {
		findStub.resolves([...vehiclesTest]);
		const projection = {status: 0, color: 0, _id: 0};
		const options = {lean: true};

		const projectedVehicles = await store.findVehicles(null, projection, options);

		projectedVehicles.forEach(vehicle => {
			expect(vehicle).to.not.have.all.keys('status', 'color', '_id');
		});
	});

	it('Should determine ESNStatus from the fields required', async () => {
		findStub.resolves([...vehiclesTest]);
		const response = await store.findVehicles(null, null, {lean: true});

		response.forEach(vehicle => {
			expect(vehicle.ESNStatus).to.be.equal('CONNECTED');
		});
	});
});