const router = require('express').Router();
const validateUser = require('../../config/common/validateUser');
const customerProfileController = require('../../api/controllers/customerProfileController');

// route prefix = /customerProfile
router.post('/createNew', validateUser, customerProfileController.createNewCustomer);
router.post('/addVerxResponse', validateUser, customerProfileController.addVerxResponse);
router.post('/sendStartContract', customerProfileController.sendStartContractEmail);

router.put('/updateCustomerDetail', validateUser, customerProfileController.editCustomerDetail);

router.get('/getCustomers', validateUser, customerProfileController.getCustomers2);
router.get('/getCustomerByID', validateUser, customerProfileController.getCustomerByID);
router.get('/checkDL', customerProfileController.checkUniqueDL);
router.get('/checkEmail', customerProfileController.checkUniqueEmail);
router.get('/checkMobile', customerProfileController.checkUniqueMobile);
router.delete('/remove', validateUser, customerProfileController.deleteCustomer);

module.exports = router;


