const Vehicle = require('../api/models/vehicle.js');
const Schedule = require('../api/models/scheduler');
const moment = require('moment');
const cron = require('node-cron');
const _ = require('lodash');

require('dotenv').config();

const mongoose = require('mongoose');

let getConnection = async () => {
	try {
		await mongoose.connect(
			process.env.DB_HOST,
			{ useCreateIndex: true, useNewUrlParser: true }
		);
		console.log('Connection to DB Successful');
	} catch (err) {
		console.log('Connection to DB Failed' + err);
		throw err;
	}
};


async function rip(){
	await getConnection();
	try {
		cron.schedule('0,15,30,45 * * * * *', async () => {
			let currentMinute = moment(moment.now()).format('YYYY/MM/DD-HH:mm').toString();
			console.log('Cron client execution at:' + moment(moment.now()).format('YYYY/MM/DD-HH:mm:ss'));
			Schedule.find({
				scheduledAt: currentMinute,
				state: 'OPEN'
			})
				.then( async jobs => {
					console.log('jobs brought in:' + ' size: ' + jobs.length);
					if(jobs && jobs.length > 0) {
						_.forEach(jobs, function (job){
							console.log(job.objective);
							switch (job.objective.toString()) {
							case 'VEHICLE_STATUS_CHANGE':
								VehicleStatusChange(job);
								break;
							}
						});
					}
				})
				.catch(err => {
					console.log(err);
				});
		});
	} catch (e) {
		console.log('an error occured: ' + e);
		throw e;
	}
}

function VehicleStatusChange(job) {
	console.log({job});
	let {vehicleID, statusTo} = job.params;
	Vehicle.updateOne({
		_id: vehicleID
	}, {
		$set: {
			status: statusTo
		}
	}, (err) => {
		return !err;
	});
	job.state = 'CLOSED';
	job.save();
}

rip().then(r => {console.log('cronWorker started.');});

