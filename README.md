
# LLM Assessment Project

## Overview

This project contains two senior-level problems:

1. **AI-Powered Risk Engine with LLM Explanations**
2. **Multi-Tenant Payment Platform Skeleton**

---

## 🔧 Project Setup

1. Clone the project:

   ```bash
   git clone https://github.com/shantarammali/llm_assessment.git
   cd llm_assessment/
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root folder with the following contents:

   ```env
   OPENAI_API_KEY=<your_openai_api_key>
   JWT_SECRET=<your_jwt_secret>
   PORT=3000
   ```

4. Start the project:

   ```bash
   npx ts-node-dev src/index.ts
   ```

---

## 🧪 API Testing with Postman

### 🧠 Senior Problem 1: AI-Powered Risk Engine with LLM Explanations

#### 1. Risk Evaluation API

- **URL:** `http://localhost:3000/evaluate-risk`  
- **Method:** `POST`  
- **Payload:**

   ```json
   {
     "amount": 5000,
     "currency": "USD",
     "ip": "198.51.100.22",
     "deviceFingerprint": "abc123",
     "email": "user@fraud.net"
   }
   ```

- **Response:**

   ```json
   {
     "score": 0.8999999999999999,
     "riskLevel": "high",
     "explanation": "Fallback LLM: Risk analysis for \nTransaction details:\nAmount: 5000 USD\nIP: 198.51.100.22\nDevice: abc123\nEmail: user@fraud.net\n\nFraud Score: 0.8999999999999999\nRisk Level: HIGH\n\nExplain why this transaction was marked as \"high\" based on these factors:\nuse of a flagged domain, high transaction amount."
   }
   ```

#### Fraud Score Heuristics

- High-risk email domains (e.g., `.ru`, `fraud.net`)
- Large transaction amount
- Reused IP or device fingerprint

#### 2. Fraud Score Analytics API

- **URL:** `http://localhost:3000/fraud-stats/`  
- **Method:** `GET`  
- **Response:**

   ```json
   {
     "low": 0,
     "moderate": 0,
     "high": 1
   }
   ```

---

### 🏢 Senior Problem 2: Multi-Tenant Payment Platform Skeleton

#### 1. Login (Get JWT)

- **URL:** `http://localhost:3000/auth/login`  
- **Method:** `POST`  
- **Payload:**

   ```json
   {
     "username": "alice",
     "password": "admin123"
   }
   ```

- **Response:**

   ```json
   {
     "token": "eyJhbGciOiJIUzI1NiIs..."
   }
   ```

#### 2. Onboard Tenant (Admin Only)

- **URL:** `http://localhost:3000/payments/tenants/create`  
- **Method:** `POST`  
- **Headers:**  
  `Authorization: Bearer <your_token_here>`  
- **Payload:**

   ```json
   {
     "tenantId": "paypal_new_tenant",
     "preferredProcessor": "paypal",
     "user": {
       "role": "admin"
     }
   }
   ```

- **Response:**

   ```json
   {
     "message": "Tenant onboarded into json file",
     "tenantId": "paypal_new_tenant"
   }
   ```

> 🔸 Supported `preferredProcessor`: `"paypal"` or `"stripe"`

#### 3. Perform Payment (Admin Only)

- **URL:** `http://localhost:3000/payments/tenants/<tenant_id>/pay`  
- **Method:** `POST`  
- **Headers:**  
  `Authorization: Bearer <your_token_here>`  
- **Payload:**

   ```json
   {
     "amount": 1000,
     "currency": "USD",
     "source": "tok_visa",
     "user": {
       "role": "admin"
     }
   }
   ```

- **Response:**

   ```json
   {
     "success": true,
     "transactionId": "paypal_txn_1750316487466",
     "message": "PayPal payment success"
   }
   ```

#### 4. Tenant Summary (LLM Generated)

- **URL:** `http://localhost:3000/payments/tenants/<tenant_id>/summary`  
- **Method:** `POST`  
- **Headers:**  
  `Authorization: Bearer <your_token_here>`  
- **Response:**

   ```json
   {
     "tenantId": "paypal_new_tenant",
     "summary": "Activity Summary:\n- Tenant \"paypal_new_tenant\" made a successful transaction of 1000 USD on June 19, 2025, at 05:21:39.915 UTC.\n\nRisk Profile:\n- Overall, the risk associated with this transaction appears to be low as it was successful and the amount is not unusually high.\n- The timestamp indicates that the transaction occurred in the early morning, which may be considered a normal time for online transactions.\n- There are no apparent anomalies or trends that suggest any suspicious activity at this time.\n\nOverall, based on this single transaction, the risk profile for tenant \"paypal_new_tenant\" is currently low."
   }
   ```

---

## 📌 Notes

- Use Postman for all API testing.
- Make sure your `.env` file is correctly configured before running the project.
- Use only **admin users** to onboard tenants or make payments.
