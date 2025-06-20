
# LLM Assessment Project

## Overview

This project contains two senior-level problems:

1. **AI-Powered Risk Engine with LLM Explanations**
2. **Multi-Tenant Payment Platform Skeleton**
3. **Payment Retry & Circuit Breaker Pattern**

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
### 🏢 Senior Problem 3: Payment Retry & Circuit Breaker Pattern

#### 1. Simulate a Flaky Payment Provider
#### 2. Circuit Breaker Logic
#### 3. LLM Integration

> Note : This three points implemented in with above payment pay API.

#### We can see status summary 
- **URL:** `http://localhost:3000/payments/status/summary`  
- **Method:** `GET`  
- **Headers:**  
  `Authorization: Bearer <your_token_here>`  
- **Response:**

   ```json
   {
    "summaries": {
        "paypal_new_tenant:paypal": "That's great to hear! It's always good when payment transactions are running smoothly without any issues due to provider instability. Keep up the good work!",
        "viewer_tenant:paypal": "No recent summary",
        "viewer_tenant_2_created_by_admin_token:paypal": "No recent summary",
        "viewer_tenant_3_created_by_admin_token:paypal": "No recent summary",
        "viewer_tenant_3_created_by_admin_token_1:paypal": "No recent summary",
        "paypal_tenant_123:paypal": "No recent summary"
    }
   }
   ```

 ### We can see status 

 - **URL:** `http://localhost:3000/payments/status`  
- **Method:** `GET`  
- **Headers:**  
  `Authorization: Bearer <your_token_here>`  
- **Response:**

   ```json
   {
    "paypal_new_tenant:paypal": {
        "circuitState": "closed",
        "failureCount": 1,
        "lastFailure": "2025-06-20T05:05:45.079Z"
    }
  }
   ```

 ### Metrics (global, curcuits (with total request, success and failure count), retries, persistant etc..)
 - **URL:** `http://localhost:3000/metrics/`  
- **Method:** `GET`    
- **Response:**

   ```json
   {
    "timestamp": "2025-06-20T05:08:40.193Z",
    "global": {
        "totalRequests": 15,
        "totalSuccessfulRequests": 14,
        "totalFailedRequests": 1,
        "totalRetries": 17,
        "averageResponseTime": 0,
        "globalFailureRate": 0.06666666666666667,
        "averageRetriesPerRequest": 1.1333333333333333
    },
    "circuits": [
        {
            "breakerKey": "paypal_new_tenant:paypal",
            "totalRequests": 15,
            "successfulRequests": 14,
            "failedRequests": 1,
            "retryCount": 17,
            "circuitStateTransitions": [],
            "currentState": "CLOSED",
            "lastStateChange": 1750395892978,
            "averageResponseTime": 912,
            "failureRate": 0.06666666666666667
        }
    ],
    "retries": [
        {
            "breakerKey": "paypal_new_tenant:paypal",
            "totalRetries": 17,
            "successfulRetries": 8,
            "failedRetries": 1,
            "averageRetriesPerRequest": 1.1333333333333333
        }
    ],
    "persistence": {
        "fileExists": true,
        "fileSize": 1728,
        "lastModified": "2025-06-20T05:08:17.039Z",
        "backupExists": true
    },
    "activeCircuitBreakers": 1,
    "activeSummaries": 1
   }
   ```
 ### Global
 - **URL:** `http://localhost:3000/metrics/global`  
- **Method:** `GET`    
- **Response:**

   ```json
   {
    "timestamp": "2025-06-20T05:11:35.086Z",
    "totalRequests": 15,
    "totalSuccessfulRequests": 14,
    "totalFailedRequests": 1,
    "totalRetries": 17,
    "averageResponseTime": 0,
    "globalFailureRate": 0.06666666666666667,
    "averageRetriesPerRequest": 1.1333333333333333
  }
   ```  
  ### Circuit
- **URL:** `http://localhost:3000/metrics/circuits`  
- **Method:** `GET`    
- **Response:**

   ```json
	{
    "timestamp": "2025-06-20T05:12:32.125Z",
    "circuits": [
        {
            "breakerKey": "paypal_new_tenant:paypal",
            "totalRequests": 15,
            "successfulRequests": 14,
            "failedRequests": 1,
            "retryCount": 17,
            "circuitStateTransitions": [],
            "currentState": "CLOSED",
            "lastStateChange": 1750395892978,
            "averageResponseTime": 912,
            "failureRate": 0.06666666666666667,
            "retryMetrics": {
                "breakerKey": "paypal_new_tenant:paypal",
                "totalRetries": 17,
                "successfulRetries": 8,
                "failedRetries": 1,
                "averageRetriesPerRequest": 1.1333333333333333
            }
        }
    ]
  }
   ```

 ###  Circuit with breaker key
 - **URL:** `http://localhost:3000/metrics/circuits/<breakery_key>`  
- ** Ex Breaker KEY : paypal_new_tenant:paypal
- **Method:** `GET`    
- **Response:**

   ```json
   {
    "timestamp": "2025-06-20T05:14:35.581Z",
    "circuit": {
        "breakerKey": "paypal_new_tenant:paypal",
        "totalRequests": 15,
        "successfulRequests": 14,
        "failedRequests": 1,
        "retryCount": 17,
        "circuitStateTransitions": [],
        "currentState": "CLOSED",
        "lastStateChange": 1750395892978,
        "averageResponseTime": 912,
        "failureRate": 0.06666666666666667,
        "retryMetrics": {
            "breakerKey": "paypal_new_tenant:paypal",
            "totalRetries": 17,
            "successfulRetries": 8,
            "failedRetries": 1,
            "averageRetriesPerRequest": 1.1333333333333333
        }
    }
  }
  ```

 ###  Persistance
- **URL:** `http://localhost:3000/metrics/persistence`  
- **Method:** `GET`    
- **Response:**

   ```json
     {
    "timestamp": "2025-06-20T05:15:30.932Z",
    "persistence": {
        "fileExists": true,
        "fileSize": 1728,
        "lastModified": "2025-06-20T05:15:17.158Z",
        "backupExists": true
    }
  }
   ```

   ###  Circuit Health
- **URL:** `http://localhost:3000/metrics/health`
- **Method:** `GET`    
- **Response:**

   ```json
    {
    "timestamp": "2025-06-20T05:53:45.363Z",
    "status": "healthy",
    "uptime": 14.2397848,
    "memory": {
        "rss": 49418240,
        "heapTotal": 12636160,
        "heapUsed": 10182912,
        "external": 2298809,
        "arrayBuffers": 18815
    },
    "metrics": {
        "totalRequests": 0,
        "failureRate": 0,
        "activeCircuits": 0
    }
  }
   ```


---

## 📌 Notes

- Use Postman for all API testing.
- Make sure your `.env` file is correctly configured before running the project.
- Use only **admin users** to onboard tenants or make payments.
