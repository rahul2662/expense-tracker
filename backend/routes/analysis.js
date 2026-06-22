const { Router } = require('express');
const { computeAnalysis } = require('../services/analysis');

const router = Router();

router.get('/analysis', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const result = await computeAnalysis({ from, to });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
