const surveyService = require("../services/surveyService");

exports.createSurvey = async (req, res, next) => {
  try {
    const survey = await surveyService.createSurvey(req.user.id, req.body);
    res.status(201).json(survey);
  } catch (error) {
    next(error);
  }
};
