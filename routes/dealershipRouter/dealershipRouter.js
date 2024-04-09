const router = require('express').Router();
const validateUser = require('../../config/common/validateUser');
const dealershipController = require('../../api/controllers/dealershipController');

// router prefix = '/dealership'
router.post('/setbusinesshours', validateUser, dealershipController.setBusinessHours);
router.post('/addPresetFees', validateUser, dealershipController.addAdditionalFees);
router.post('/addTaxPreset', validateUser, dealershipController.addTaxPresets);
router.post('/addHoliday', validateUser, dealershipController.addHoliday);
router.post('/addHolidayRange', validateUser, dealershipController.addHolidayRange);
router.post('/unFreezeEmployee', validateUser, dealershipController.unfreezeEmployee);
router.post('/setOdometerKMCharge', validateUser, dealershipController.setOdometerCharge);
router.post('/setGasCharge', validateUser, dealershipController.setGasCharge);
router.post('/setFreeKilometers', validateUser, dealershipController.setFreeKilometers);
router.post('/setWarrantyRate', validateUser, dealershipController.setWarrantyRate);
router.post('/setPreAuthAmount', validateUser, dealershipController.setPreAuthAmount);
router.post('/toggleTaxPreset', validateUser, dealershipController.toggleTaxPreset);

router.delete('/deleteTaxPreset', validateUser, dealershipController.deleteTaxPreset);
router.delete('/deletePresetFees', validateUser, dealershipController.deleteAdditionalFees);
router.delete('/deleteHoliday/:date', validateUser, dealershipController.removeHoliday);
router.delete('/deleteHolidayRange', validateUser, dealershipController.removeHolidayRange);

router.get('/addverxcall', validateUser, dealershipController.verXCallRecord);
router.get('/getHolidays', validateUser, dealershipController.getHolidays);

module.exports = router;