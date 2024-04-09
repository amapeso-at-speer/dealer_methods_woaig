const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const uniqueValidator = require('mongoose-unique-validator');
const autoIncrement = require('mongoose-auto-increment');
// sid = require('shortid'),
const Schema = mongoose.Schema;
const ContractSchema = new Schema({
	contractType: {
		type: String,
		default: 'RENTAL',
		enum: ['RENTAL', 'RESERVATION', 'SERVICE_LOANER']
	},
	customerProfileID: {
		type: String,
		required: true
	},
	contractNumber: {
		type: Number
	},
	customerEmail: {
		type: String
	},
	customerName: {
		type: String
	},
	customerContactNumber: {
		type: String
	},
	openTimeStamp: {
		type: Date,
		default: Date.now
	},
	closeTimeStamp: {
		type: Date,
	},
	vehiclePickupTimeStamp: {
		type: Date
	},
	vehicleDropOffTimeStamp: {
		type: Date
	},
	vehicleID: {
		type: String
	},
	QRCode: {
		type: String
	},
	expectedReservationCategory: {
		type: String
	},
	createdBy: {
		type: String,
		required: true
	},
	closedBy: {
		type: String
	},
	signatureImage :{
		type: String,
		// required: true
	},
	verXResponse: {
		type: Object,
	},
	cardDetails: {
		type: String
	},
	cardExpiryDate: {
		type: String
	},
	serviceAdvisor: {
		type: String
	},
	odometerReadingStart: String,
	odometerReadingEnd : String,
	odometerReadingStartInKilometers: String,
	odometerReadingEndInKilometers: String,
	fuelReadingStart: String,
	fuelReadingEnd: String,
	fuelLabelStartPercentage: Number,
	fuelLabelEndPercentage: Number,
	additionalDriver: [{
		name: String,
		dateOfBirth: Date,
		driversLicenseNumber: String, //Store without dashes
		licenseExpirationDate: Date,
		address: String,
		phone: String,
		licenseClass: String,
		provinceCode: String,
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
	}],
	customerInvoicePdfLocation: String,
	internalInvoicePdfLocation: String,
	lastCustomerInvoiceDownload: Date,
	lastInternalInvoiceDownload: Date,
	lastCustomerInvoiceEmail: Date,
	lastInternalInvoiceEmail: Date,
	isCancelled: {
		type: Boolean,
		default: false
	},
	repairOrderNumber: String,
	dealershipID: String,
	contractReferenceID: String,
	transactions: [
		{
			transactionID: String,
			createdAt: {
				type: Date,
				default: Date.now()
			},
			transactionAmount: String,
			transactionType: { 
				type: String,
				enum: ['WARRANTY', 'INTERNAL', 'CUSTOMER']
			},
			transactionObject: Object
		}
	]
}, {
	timestamps: true
});

autoIncrement.initialize(mongoose.connection);
ContractSchema.plugin(autoIncrement.plugin, { model: 'Contract', field: 'contractNumber' });

module.exports = mongoose.model('Contract', ContractSchema);


// Sample transaction:
//    "transaction": {
//         "id": "kzqbabfp",
//         "status": "authorized",
//         "type": "sale",
//         "currencyIsoCode": "CAD",
//         "amount": "10.00",
//         "merchantAccountId": "speer",
//         "subMerchantAccountId": null,
//         "masterMerchantAccountId": null,
//         "orderId": null,
//         "createdAt": "2020-08-12T05:44:52Z",
//         "updatedAt": "2020-08-12T05:44:52Z",
//         "customer": {
//             "id": "884576911",
//             "firstName": "Tae",
//             "lastName": "Jun",
//             "company": null,
//             "email": "tae@speer.io",
//             "website": null,
//             "phone": "6478719365",
//             "fax": null,
//             "globalId": "Y3VzdG9tZXJfODg0NTc2OTEx"
//         },
//         "billing": {
//             "id": null,
//             "firstName": null,
//             "lastName": null,
//             "company": null,
//             "streetAddress": null,
//             "extendedAddress": null,
//             "locality": null,
//             "region": null,
//             "postalCode": null,
//             "countryName": null,
//             "countryCodeAlpha2": null,
//             "countryCodeAlpha3": null,
//             "countryCodeNumeric": null
//         },
//         "refundId": null,
//         "refundIds": [],
//         "refundedTransactionId": null,
//         "partialSettlementTransactionIds": [],
//         "authorizedTransactionId": null,
//         "settlementBatchId": null,
//         "shipping": {
//             "id": null,
//             "firstName": null,
//             "lastName": null,
//             "company": null,
//             "streetAddress": null,
//             "extendedAddress": null,
//             "locality": null,
//             "region": null,
//             "postalCode": null,
//             "countryName": null,
//             "countryCodeAlpha2": null,
//             "countryCodeAlpha3": null,
//             "countryCodeNumeric": null
//         },
//         "customFields": "",
//         "avsErrorResponseCode": null,
//         "avsPostalCodeResponseCode": "I",
//         "avsStreetAddressResponseCode": "I",
//         "cvvResponseCode": "I",
//         "gatewayRejectionReason": null,
//         "processorAuthorizationCode": "743Q0X",
//         "processorResponseCode": "1000",
//         "processorResponseText": "Approved",
//         "additionalProcessorResponse": null,
//         "voiceReferralNumber": null,
//         "purchaseOrderNumber": null,
//         "taxAmount": null,
//         "taxExempt": false,
//         "processedWithNetworkToken": false,
//         "creditCard": {
//             "token": "mbs4d62",
//             "bin": "411111",
//             "last4": "1111",
//             "cardType": "Visa",
//             "expirationMonth": "09",
//             "expirationYear": "2020",
//             "customerLocation": "US",
//             "cardholderName": null,
//             "imageUrl": "https://assets.braintreegateway.com/payment_method_logo/visa.png?environment=sandbox",
//             "prepaid": "Unknown",
//             "healthcare": "Unknown",
//             "debit": "Unknown",
//             "durbinRegulated": "Unknown",
//             "commercial": "Unknown",
//             "payroll": "Unknown",
//             "issuingBank": "Unknown",
//             "countryOfIssuance": "Unknown",
//             "productId": "Unknown",
//             "globalId": "cGF5bWVudG1ldGhvZF9jY19tYnM0ZDYy",
//             "graphQLId": "cGF5bWVudG1ldGhvZF9jY19tYnM0ZDYy",
//             "accountType": null,
//             "uniqueNumberIdentifier": "049cfd47b64e744dac9bf390e5d1e448",
//             "venmoSdk": false,
//             "maskedNumber": "411111******1111",
//             "expirationDate": "09/2020"
//         },
//         "statusHistory": [
//             {
//                 "timestamp": "2020-08-12T05:44:52Z",
//                 "status": "authorized",
//                 "amount": "10.00",
//                 "user": "taehoon719",
//                 "transactionSource": "api"
//             }
//         ],
//         "planId": null,
//         "subscriptionId": null,
//         "subscription": {
//             "billingPeriodEndDate": null,
//             "billingPeriodStartDate": null
//         },
//         "addOns": [],
//         "discounts": [],
//         "descriptor": {
//             "name": null,
//             "phone": null,
//             "url": null
//         },
//         "recurring": false,
//         "channel": null,
//         "serviceFeeAmount": null,
//         "escrowStatus": null,
//         "disbursementDetails": {
//             "disbursementDate": null,
//             "settlementAmount": null,
//             "settlementCurrencyIsoCode": null,
//             "settlementCurrencyExchangeRate": null,
//             "fundsHeld": null,
//             "success": null
//         },
//         "disputes": [],
//         "authorizationAdjustments": [],
//         "paymentInstrumentType": "credit_card",
//         "processorSettlementResponseCode": "",
//         "processorSettlementResponseText": "",
//         "networkResponseCode": null,
//         "networkResponseText": null,
//         "threeDSecureInfo": null,
//         "shipsFromPostalCode": null,
//         "shippingAmount": null,
//         "discountAmount": null,
//         "networkTransactionId": "020200812054452",
//         "processorResponseType": "approved",
//         "authorizationExpiresAt": "2020-08-19T05:44:52Z",
//         "refundGlobalIds": [],
//         "partialSettlementTransactionGlobalIds": [],
//         "refundedTransactionGlobalId": null,
//         "authorizedTransactionGlobalId": null,
//         "globalId": "dHJhbnNhY3Rpb25fa3pxYmFiZnA",
//         "graphQLId": "dHJhbnNhY3Rpb25fa3pxYmFiZnA",
//         "retryIds": [],
//         "retriedTransactionId": null,
//         "retrievalReferenceNumber": "1234567",
//         "paypalAccount": {},
//         "paypalHereDetails": {},
//         "localPayment": {},
//         "coinbaseAccount": {},
//         "applePayCard": {},
//         "androidPayCard": {},
//         "visaCheckoutCard": {},
//         "masterpassCard": {},
//         "samsungPayCard": {}
//     },
//     "success": true
// }
