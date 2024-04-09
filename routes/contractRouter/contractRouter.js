const router = require('express').Router();
const validateUser = require('../../config/common/validateUser');
const contractController = require('../../api/controllers/contractController');


//route prefix = /contract
router.post('/open', validateUser, contractController.openContract);
router.post('/close', validateUser, contractController.closeContract);
router.post('/getByCustomerID', validateUser, contractController.getContractsByCustomerID);
router.get('/getTransactionsByContractId', validateUser, contractController.getContractTransactionsById);
router.post('/getActiveByCustomerID', validateUser, contractController.getActiveContractsByCustomerID);
router.post('/editContract', contractController.editContract);
router.post('/cancel', validateUser, contractController.cancelContract);
router.post('/addTransaction', contractController.addTransaction);
router.post('/calculateGasCharge', validateUser, contractController.calculateGasCharge);

router.get('/getRunning', contractController.getRunningContracts);
router.get('/getByVehicleID', validateUser, contractController.getContractsWithVehicle);
router.get('/getContractsByTimeRange', validateUser, contractController.getStartedContractsWithinTimeRange);
router.get('/getPaginatedContracts', validateUser, contractController.getContractsPaginated);
router.get('/getNonReservationContracts', validateUser, contractController.getNonReservationContracts);
router.get('/filterContractsByDate', validateUser, contractController.filterContractsByDate);


module.exports = router;
