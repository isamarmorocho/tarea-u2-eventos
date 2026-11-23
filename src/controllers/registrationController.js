const registrationService = require("../services/registrationService");

exports.createRegistration = async (req, res, next) => {
  try {
    // userId SIEMPRE sale del token (authenticateToken → req.user)
    const registration = await registrationService.createRegistration(req.user.id, req.body);
    res.status(201).json(registration);
  } catch (error) {
    next(error);
  }
};

exports.listMyRegistrations = async (req, res, next) => {
  try {
    res.json(await registrationService.listMyRegistrations(req.user.id));
  } catch (error) {
    next(error);
  }
};

exports.getRegistration = async (req, res, next) => {
  try {
    res.json(await registrationService.getRegistration(req.user, req.params.id));
  } catch (error) {
    next(error);
  }
};

exports.cancelRegistration = async (req, res, next) => {
  try {
    res.json(await registrationService.cancelRegistration(req.user, req.params.id));
  } catch (error) {
    next(error);
  }
};
