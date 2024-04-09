const mongoose = require('mongoose');
const Invoice = mongoose.model('Invoice');

module.exports = {
	async createInvoice(invoiceData, charges) {
		try {
			return await this.saveInvoice(new Invoice({
				customerProfileID: invoiceData.customerID,
				vehicleID: invoiceData.vehicleID,
				contractID: invoiceData.contractID,
				charges: charges,
				customerPayPercentage: invoiceData.customerPayPercentage || 100
			}));
		} catch (error) {
			throw { error, invoiceData };
		}
	},
	
	async saveInvoice(invoice)  {
		try {
			return await invoice.save();
		} catch (error) {
			throw { error, invoice };
		}
	}
};
