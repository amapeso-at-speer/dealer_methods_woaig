/* eslint-disable no-unused-vars */
require('dotenv').config();
const amqp = require('amqplib/callback_api');

// eslint-disable-next-10-line no-unused-vars
const User = require('../api/models/user.js');
const Contract = require('../api/models/contract.js');
const customerProfile = require('../api/models/customerProfile');
const Vehicle = require('../api/models/vehicle');
const Invoice = require('../api/models/invoice');
const ExpiredTokens = require('../api/models/expiredToken');
const BusinessHours = require('../api/models/busineesHours');
const Constants = require('../config/constants');
const Dealership = require('../api/models/dealership');
const DealershipHoliday = require('../api/models/dealershipHoliday');

let customerProfileController = require('../api/controllers/customerProfileController');

amqp.connect(process.env.AMQ_CONN_URL, function (err, conn) {
	conn.createChannel(function (err, ch) {
		ch.consume(process.env.CONTRACT_EMAIL_QUEUE, async function (msg) {
			try{
				let {customerDetail, vehicleDetail, contractDetail} = await JSON.parse(msg.content.toString());
				console.log(customerDetail, vehicleDetail, contractDetail);
				await customerProfileController.sendStartContractEmail(customerDetail, vehicleDetail, contractDetail, (err, emailResponse) => {
					console.error({err, emailRecipient: emailResponse.envelope.to});
				});
				ch.ack(msg);
				console.log('acked msg with');
			} catch (e) {
				console.log(e);
			}
		}, {
			noAck: false
		}
		);
	});
});
