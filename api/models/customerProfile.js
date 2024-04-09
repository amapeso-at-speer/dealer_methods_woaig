const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const mongoose_fuzzy_searching = require('mongoose-fuzzy-searching');
const autoIncrement = require('mongoose-auto-increment');
const Schema = mongoose.Schema;
const CustomerProfile = new Schema({
	firstName: {
		type: String,
		required: true
	},
	customerNumber: {
		type: Number
	},
	lastName: {
		type: String,
		default: null
	},
	mobileNumber: {
		type: String,
		trim: true,
		unique: true,
		index: true,
	},
	emailAddress: {
		type: String,
		trim: true,
		unique: true,
		sparse: true,
		index: true
	},
	dateOfBirth: {
		type: Date
	},
	scannedID: {
		image: {
			type: String,
			default: null
		},
		identificationNumber: {
			type: String,
			trim: true,
			unique: true
		},
		expirationDate: {
			type: Date,
			default: Date.now
		},
		address: {
			type: String,
		},
		areaCode: {
			type: String,
			trim: true
		},
		dlClass: {
			type: String
		},
		postalCodeVerx: {
			type: String
		}
	},
	dealershipID: String,
	insurance: {
		image: {
			type: String,
		},
		insuranceNumber : {
			type: String
		},
		expirationDate: {
			type: Date,
			default: Date.now
		},
		companyName: {
			type: String
		}
	},
	customerStatus: {
		type: String,
		enum: ['ACTIVE', 'SUSPENDED'],
		default: 'ACTIVE'
	},
	createdBy: {
		type: String
	},
	notes: [
		{
			s3Link: {
				type: Array,
				default: []
			},
			description: {
				type: String
			}
		}
	],
	brainTreeID: String,
	brainTreeToken: String,
	lastAdditionalDriver: [{
		type: Object,
		default: null
	}],
	verXResponses: [
		{
			response: {
				type: Object
			},
			createdAt: {
				type: Date,
				default: Date.now
			}
		}
	],
	isDeleted: {
		type: Boolean,
		default: false
	}
}, {
	timestamps: true
});

CustomerProfile.plugin(mongoose_fuzzy_searching, {fields: ['firstName', 'lastName', 'emailAddress']});
CustomerProfile.plugin(uniqueValidator, {message: 'is already taken.'});
//
// CustomerProfile.createIndex({
//
// })

CustomerProfile.post('init', function(doc) {
	if (doc.verXResponses && doc.verXResponses.length > 0) {
		doc.verXResponses = doc.verXResponses.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
	}
	return doc;
});

CustomerProfile.index({
	firstName: 'text',
	lastName: 'text',
	emailAddress: 'text'
	// "$**" : "text"
});

autoIncrement.initialize(mongoose.connection);
CustomerProfile.plugin(autoIncrement.plugin, { model: 'CustomerProfile', field: 'customerNumber' });

module.exports = mongoose.model('CustomerProfile', CustomerProfile);

