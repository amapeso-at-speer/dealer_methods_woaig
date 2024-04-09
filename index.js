require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const User = require('./api/models/user.js');
const Contract = require('./api/models/contract.js');
const customerProfile = require('./api/models/customerProfile');
const Vehicle = require('./api/models/vehicle');
const Invoice = require('./api/models/invoice');
const ExpiredTokens = require('./api/models/expiredToken');
const BusinessHours = require('./api/models/busineesHours');
const Constants = require('./config/constants');
const Dealership = require('./api/models/dealership');
const DealershipHoliday = require('./api/models/dealershipHoliday');
const Scheduler = require('./api/models/scheduler');
// const { logger } = require('./config/common/log/logger');
const trimRequest = require('trim-request');


mongoose.connect(process.env.DB_HOST, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });

app.use(morgan('tiny'));
app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(trimRequest.all);

// set app secret
app.set(process.env.APP_SECRET_KEY, process.env.JWT_SECRET_KEY);

let routes = require('./routes/routes.js');
routes(app);

app.use(function (req, res) {
	res.status(404).send({url: req.originalUrl + Constants.APP_MESSAGE.NOT_FOUND_ERROR});
});

const port = process.env.PORT || Constants.SERVER.PORTS.EXPRESS;
app.listen(port);

console.log('DM REST API server started on: ' + port);

module.exports = app;

