import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import evaluateRoute from './routes/evaluate';
import paymentRoutes from './routes/payment';
import authRoutes from './routes/auth';
import './types/ExtendExpressTenant';



const app = express();
app.use(express.json());
app.use('/', evaluateRoute);

app.use('/payments', paymentRoutes);
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`== Server running on port ${PORT}`);
});
