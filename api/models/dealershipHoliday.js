const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DealerShipHolidaySchema = new Schema({
	dealershipID: String,
	holidays: {
		type: [Date]
	}
});

module.exports = mongoose.model('DealershipHoliday', DealerShipHolidaySchema);
