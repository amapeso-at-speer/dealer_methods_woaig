const router = require('express').Router();
const validateUser = require('../../config/common/validateUser');
const vehicleController = require('../../api/controllers/vehicleController');

//router prefix = /vehicle
router.post('/addNew', validateUser, vehicleController.addNewVehicle);
router.post('/editVehicleDetails', validateUser, vehicleController.editVehicleDetail);
router.post('/addIssue', validateUser, vehicleController.addIssue);
router.post('/deregister', validateUser, vehicleController.deregisterVehicle);
router.post('/confirmPickup', validateUser, vehicleController.confirmVehiclePickup);

router.put('/changeAvailability', validateUser, vehicleController.changeVehicleAvailability);

router.get('/findVehicle', validateUser, vehicleController.findVehicles);
router.get('/getAvailable', validateUser, vehicleController.getAllAvailableVehicles);
router.get('/getUnavailable', validateUser, vehicleController.getAllUnavailableVehicles);
router.get('/getAvailableByTime', validateUser, vehicleController.getAvailableVehiclesByTime);

module.exports = router;