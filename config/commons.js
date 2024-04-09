const AWS = require('aws-sdk');
const Constants = require('./constants');
const nodemailer = require('nodemailer');
const axios = require('axios');
const fs = require('fs');

AWS.config.update({
	accessKeyId: process.env.AWSaccessKeyId,
	secretAccessKey: process.env.AWSsecretAccessKey,
	region: process.env.AWSregion
});
const ses = new AWS.SES({ apiVersion: '2010-12-01' });
const s3 = new AWS.S3();

let transporter = nodemailer.createTransport({
	SES: new AWS.SES({
		apiVersion: '2010-12-01'
	})
});

exports.sendSignUpEmail = (recipientAddress, recipientName, callback) => {
	const params = {
		'Source': Constants.SERVER.SENDER_EMAIL,
		'Template': 'signup',
		'ConfigurationSetName': Constants.SERVER.AWS_EMAIL_CONFIGSET,
		'Destination': {
			'ToAddresses': [recipientAddress]
		},
		'TemplateData': '{ "name": "' + recipientName +  '" }'
	};
	// console.log(params);
	sendEmail(params, (err, data) => {
		callback(err, data);
	});
};

exports.sendCustomerSignUpEmail = (recipientAddress, recipientName, callback) => {
	const params = {
		'Source': Constants.SERVER.SENDER_EMAIL,
		'Template': 'customerSignUp',
		'ConfigurationSetName': Constants.SERVER.AWS_EMAIL_CONFIGSET,
		'Destination': {
			'ToAddresses': [recipientAddress]
		},
		'TemplateData': '{ "name": "' + recipientName +  '" }'
	};
	// console.log(params);
	sendEmail(params, (err, data) => {
		callback(err, data);
	});
};

let sendEmail = (params, callback) => {
	ses.sendTemplatedEmail(params, (err, data) =>  {
		callback(err, data);
	});
};

exports.sendTextEmail = (params, callback) => {
	let mailOptions = {
		from: Constants.SERVER.SENDER_EMAIL,
		to: params.recipientAddress,
		subject: params.subject,
		text: params.text || ' ',
	};
	// console.log(mailOptions);
	let ccTeam = {params};
	if(ccTeam){
		mailOptions.cc = Constants.SERVER.TEAM_EMAIL;
	}
	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			// console.log(error);
			return callback(error);
		}
		// console.log(info);
		callback(error, info);
	});
};

exports.sendHTMLEmail = (params, callback) => {
	let mailOptions = {
		from: Constants.SERVER.SENDER_EMAIL,
		to: params.recipientAddress,
		subject: params.subject,
		html: params.html || ' ',
		attachments: []
	};
	if(params.attachments){
		params.attachments.forEach(item => {
			mailOptions.attachments.push({
				filename: item.originalname,
				content: item.buffer
			});
		});
	}
	// console.log(mailOptions);
	let ccTeam = {params};
	if(ccTeam){
		mailOptions.cc = Constants.SERVER.TEAM_EMAIL;
	}
	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			// console.log(error);
			return callback(error);
		}
		// console.log(info);
		callback(error, info);
	});
};

exports.sendHTMLEmailWithoutCallBack = (params, callback) => {
	let mailOptions = {
		from: Constants.SERVER.SENDER_EMAIL,
		to: params.recipientAddress,
		subject: params.subject,
		html: params.html || ' ',
	};
	// console.log(mailOptions);
	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			console.log(error);
			// return callback(error);
		}
		// console.log(info);
		// callback(error, info);
	});
	callback();
};

exports.sendEmailWithContractAttachment = (params, callback) => {
	let mailOptions = {
		from: Constants.SERVER.SENDER_EMAIL,
		to: params.recipientAddress,
		subject: params.subject,
		text: params.text || ' ',
		// html: params.text || " ",
		attachments: [
			{
				filename: params.contractFileName,
				path: __dirname + '/contracts/' + params.contractFileName,
			}
		]
	};
	// console.log(mailOptions);
	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			console.log(error);
			return callback(error);
		}
		// console.log(info);
		callback(error, info);
	});
};

exports.sendEmailWithInvoiceAttachment = (params, callback) => {
	let mailOptions = {
		from: Constants.SERVER.SENDER_EMAIL,
		to: params.recipientAddress,
		subject: params.subject,
		text: params.text || ' ',
		// html: params.text || " ",
		attachments: [
			{
				filename: params.invoiceFileName,
				path: __dirname + '/invoice/created_invoices/' + params.invoiceFileName,
			}
		]
	};
	// console.log(mailOptions);
	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			console.log(error);
			return callback(error);
		}
		// console.log(info);
		callback(error, info);
	});
};


exports.isNullOrUndefined = (key) => {
	return key === null || key === undefined;
};

exports.forEachPromiseResolve = function (items, fn) {
	return items.reduce(function (promise, item) {
		return promise.then(function () {
			return fn(item);
		});
	}, Promise.resolve());
};

exports.forEachPromiseReject = function (items, fn, context) {
	return items.reduce(function (promise, item) {
		return promise.then(function () {
			return fn(item, context);
		});
	}, Promise.reject());
};
exports.determineESNStatus = function (QRLink, fuelVolume, batteryLevel, odometer) {
	if (!QRLink || QRLink === 'UNLINKED') {
		return 'DISCONNECTED';
	} else if ((!fuelVolume && fuelVolume !== 0 && fuelVolume !== null) || fuelVolume === 'UNLINKED') {
		return 'DISCONNECTED';
	} else if (!batteryLevel || batteryLevel === 'UNLINKED') {
		return 'DISCONNECTED';
	} else if ((!odometer && odometer !== 0) || odometer === 'UNLINKED') {
		return 'DISCONNECTED';
	} else {
		return 'CONNECTED';
	}
};

function isPromise(obj) {
	return obj && typeof obj.then === 'function';
}

function waterfallListHandle(list) {
	list = Array.prototype.slice.call(list);
	if (!Array.isArray(list)
        || typeof list.reduce !== 'function'
        || list.length < 1
	) {
		return Promise.reject('Array with reduce function is needed.');
	}

	if (list.length === 1) {
		if (typeof list[0] != 'function')
			return Promise.reject('First element of the array should be a function, got ' + typeof list[0]);
		return Promise.resolve(list[0]());
	}

	return list.reduce(function (l, r) {
		let isFirst = (l === list[0]);
		if (isFirst) {
			if (typeof l != 'function')
				return Promise.reject('List elements should be function to call.');

			let lret = l();
			if (!isPromise(lret))
				return Promise.reject('Function return value should be a promise.');
			else
				return lret.then(r);
		} else {
			if (!isPromise(l))
				Promise.reject('Function return value should be a promise.');
			else
				return l.then(r);
		}
	});
}

exports.waterfallListHandle = waterfallListHandle;

exports.sendSMS =  (params, callback) => {
	let messageObject = {
		Message: params.message,
		PhoneNumber: params.phoneNumber,
		MessageAttributes: {
			'AWS.SNS.SMS.SenderID': {
				'DataType': 'String',
				'StringValue': params.subject
			}
		}
	};
	let publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' })
		.setSMSAttributes({attributes: {
			'DefaultSMSType': 'Transactional',
		}
		})
	// .publish(messageObject)
		.promise();
	publishTextPromise
		.then(res => {
			callback(null, res);
		})
		.catch(reject => {
			callback(reject);
		});
};

const getGuidePointUnit = async function (esn) {
	try {
		return await axios.get(`${Constants.SERVER.GUIDEPOINT_BASE}unit/info?token=${process.env.GUIDEPOINT_TOKEN}&esn=${esn}`);
	} catch (error) {
		console.error({error, esn});
		throw error;
	}
};

exports.getGuidePointUnit = getGuidePointUnit;

exports.getUpdatedVehicleStats = async function(esn) {
	try {
		let currentFuel;
		let batteryLevel;
		let currentOdometerinMiles;
		let currentOdometerinKilometres;
		if (esn !== 'UNLINKED') {
			const unit = await getGuidePointUnit(esn);

			if (unit) {
				currentFuel = unit.data.vehicle.fuel;
				batteryLevel = unit.data.vehicle.battery_voltage_label;
				currentOdometerinMiles = unit.data.vehicle.miles;
				currentOdometerinKilometres = unit.data.vehicle.kilometers.toString();
			} else {
				currentFuel = 'UNLINKED';
				batteryLevel = 'UNLINKED';
				currentOdometerinMiles = 'UNLINKED';
				currentOdometerinKilometres = 'UNLINKED';
			}
		} else {
			currentFuel = 'UNLINKED';
			batteryLevel = 'UNLINKED';
			currentOdometerinMiles = 'UNLINKED';
			currentOdometerinKilometres = 'UNLINKED';
		}
		return { currentFuel, batteryLevel, currentOdometerinMiles, currentOdometerinKilometres };
	} catch (error) {
		console.error({error, esn});
		throw error;
	}
};

exports.uploadToS3Bucket = async function(Bucket, pathToFile, filename) {
	const fileContent = fs.readFileSync(pathToFile);
	
	const params = {
		Bucket,
		Key: filename,
		Body: fileContent
	};

	return await s3.upload(params).promise();
};


exports.enumToPercent = function(value) {
	if(value === 'FULL_TANK') {
		return 100;
	} else if (value === 'THREE_QUARTERS') {
		return 75;
	} else if (value === 'HALF_TANK') {
		return 50;
	} else if (value === 'ONE_QUARTER') {
		return 25;
	} else {
		return 10;
	}
};

exports.getFuelEnum = function(fuelVolume) {
	if(fuelVolume >= 90 ) {
		return 'FULL_TANK';
	} else if (fuelVolume >= 75) {
		return 'THREE_QUARTERS';
	} else if (fuelVolume >= 50) {
		return 'HALF_TANK';
	} else if (fuelVolume >= 25) {
		return 'ONE_QUARTER';
	} else {
		return 'LESS_THAN_A_QUARTER';
	}
};
