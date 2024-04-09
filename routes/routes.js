const userController = require('../api/controllers/usercontroller');
const validateUser = require('../config/common/validateUser');
const authorize = require('../config/common/authorize');
const userRouter = require('./userRouter/userRouter');
const customerProfileRouter = require('./customerProfileRouter/customerProfileRouter');
const vehicleRouter = require('./vehicleRouter/vehicleRouter');
const contractRouter = require('./contractRouter/contractRouter');
const reservationRouter = require('./reservationRouter/reservationRouter');
const dealershipRouter = require('./dealershipRouter/dealershipRouter');
const contractController = require('../api/controllers/contractController');
const customerProfileController = require('../api/controllers/customerProfileController');
const invoiceController = require('../api/controllers/invoiceController');

const multer = require('multer');
const upload = multer();


module.exports = function (app) {

	// logger.info(app);

	app.route('/')
		.get(userController.landing);

	app.route('/create')
		.post(userController.create);

	app.route('/login')
		.post(userController.authenticate);

	// app.route('/logout')
	//     .post(userController.discardSession);

	//protected paths
	app.get('/home', validateUser, userController.home);

	app.post('/changePassword', validateUser, userController.changePassword);

	app.post('/requestPasswordResetToken', userController.forgotPassword);

	app.post('/resetPasswordWithToken', userController.resetPasswordWithToken);

	app.post('/masterDelete', userController.deleteUser);

	app.post('/getAssignable', validateUser,contractController.findAssignableVehiclesForDuration);

	// app.get('/flydeploy', userController.flyDeploy);

	app.get('/sampleConvert', customerProfileController.convertDoc);

	app.post('/invoice/sendFirst', invoiceController.sendInvoice);

	app.post('/newAccountRequest', userController.receiveNewAccountRequest);

	app.post('/sendTestSMS', userController.sendSMS);

	app.post('/sendEmail', authorize, upload.array('attachments'), userController.externalEmailPassRoute);

	app.post('/sendEmailInternal', validateUser, upload.array('attachments'), userController.externalEmailPassRoute);

	/**
	 *  /user goes to userRouter
	*/
	app.use('/user', userRouter);

	/**
	 *  /customerProfile goes to customerProfileRouter
	 */
	app.use('/customerProfile', customerProfileRouter);

	/**
	 *  /vehicle goes to vehicleRouter
	 */
	app.use('/vehicle', vehicleRouter);

	/**
	 *  /contract goes to contractRouter
	 */
	app.use('/contract', contractRouter);

	/**
	 *  /reservations goes to reservationRouter
	 */
	app.use('/reservations', reservationRouter);

	/**
	 *  /dealership goes to dealershipRouter
	 */
	app.use('/dealership', dealershipRouter);

	app.post('/getPlaces', userController.getPlaces)
};
