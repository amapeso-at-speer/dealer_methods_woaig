const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const sid = require('shortid');
const InvoiceSchema = new Schema({
	invoiceType: {
		type: String,
		default: 'CONTRACTCLOSE',
		enum: ['CONTRACTCLOSE']
	},
	sid : {
		type: String,
		default: sid.generate
	},
	customerProfileID: {
		type: String,
		required: true
	},
	vehicleID: {
		type: String,
		required: true
	},
	contractID: {
		type: String,
		required: true
	},
	charges: {
		type: Object
	},
	customerPayPercentage: {
		type: Number,
		default: 100
	}
}, {
	timestamps: true
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
