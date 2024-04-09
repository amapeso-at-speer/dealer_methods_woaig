const moment = require('moment');

function generateReservationConfirmedEmail(customerEmail, customerName, customerContactNumber, vehiclePickupTimeStamp) {
	return {
		recipientAddress: customerEmail,
		subject: 'DealerMethods: Reservation Confirmed',
		text: 'Hi, \nYour reservation has been confirmed.\nName: ' + customerName + '\nContact Number: ' +
			customerContactNumber + '\nVehicle Pick Up time: ' + moment(vehiclePickupTimeStamp).tz('America/Toronto').format('LLLL') + '\n\nThank you.'
	};
}

module.exports = generateReservationConfirmedEmail;