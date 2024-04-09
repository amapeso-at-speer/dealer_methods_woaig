const userStore = require('./stores/userStore');
const dealershipStore = require('./stores/dealershipStore');
const dealershipHolidayStore = require('./stores/dealershipHolidayStore');
const contractStore = require('./stores/contractStore');
const customerProfileStore = require('./stores/customerProfileStore');
const vehicleStore = require('./stores/vehicleStore');
const invoiceStore = require('./stores/invoiceStore');

module.exports = {
	...userStore,
	...dealershipStore,
	...dealershipHolidayStore,
	...contractStore,
	...customerProfileStore,
	...vehicleStore,
	...invoiceStore
};