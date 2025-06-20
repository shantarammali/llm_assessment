import express, { Request, Response } from 'express';
import { calculateScore, getRiskLevel } from '../utils/riskScoring';
import { getLLMExplanation } from '../services/llmService';

const router = express.Router();

const scoreStats = {
  low: 0,
  moderate: 0,
  high: 0,
};

router.post('/evaluate-risk', async (req: express.Request, res: express.Response): Promise<void> => {
  const { amount, currency, ip, deviceFingerprint, email } = req.body;

  const { score, factors } = calculateScore(amount, ip, deviceFingerprint, email);
  const riskLevel = getRiskLevel(score);
  scoreStats[riskLevel] += 1;

  const prompt = `
Transaction details:
Amount: ${amount} ${currency}
IP: ${ip}
Device: ${deviceFingerprint}
Email: ${email}

Fraud Score: ${score}
Risk Level: ${riskLevel.toUpperCase()}

Explain why this transaction was marked as "${riskLevel}" based on these factors:
${factors.join(', ')}.`;
  //const prompt = `Evaluate fraud risk for email ${email}, amount ${amount}, IP ${ip}, and device ${deviceFingerprint}.`;
  const explanation = await getLLMExplanation(prompt);

  res.json({ score, riskLevel, explanation });
});

router.get('/fraud-stats', (req, res) => {
  res.json(scoreStats);
});

export default router;
