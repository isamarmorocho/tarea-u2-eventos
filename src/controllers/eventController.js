const eventService = require("../services/eventService");
const surveyService = require("../services/surveyService");

// Los errores van al errorHandler con next(error): 400 / 404 / 409
exports.listEvents = async (req, res, next) => {
  try {
    res.json(await eventService.listEvents(req.query));
  } catch (error) {
    next(error);
  }
};

exports.getEvent = async (req, res, next) => {
  try {
    res.json(await eventService.getEvent(req.params.id));
  } catch (error) {
    next(error);
  }
};

exports.createEvent = async (req, res, next) => {
  try {
    res.status(201).json(await eventService.createEvent(req.body));
  } catch (error) {
    next(error);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    res.json(await eventService.updateEvent(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    res.json(await eventService.deleteEvent(req.params.id));
  } catch (error) {
    next(error);
  }
};

exports.listSurveys = async (req, res, next) => {
  try {
    res.json(await surveyService.listSurveysByEvent(req.params.id, req.query));
  } catch (error) {
    next(error);
  }
};

exports.surveySummary = async (req, res, next) => {
  try {
    res.json(await surveyService.surveySummary(req.params.id));
  } catch (error) {
    next(error);
  }
};
