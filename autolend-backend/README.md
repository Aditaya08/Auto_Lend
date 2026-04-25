# AutoLend Backend API

Decentralized auto loan marketplace backend API built with Node.js, Express, and MongoDB.

## Base URL
\`http://localhost:5000\`

---

## 1. Authentication Module

### Register a User
- **Method:** \`POST\`
- **Path:** \`/auth/register\`
- **Body:**
  \`\`\`json
  {
    "email": "dealer@example.com",
    "password": "password123",
    "role": "dealer", 
    "btcAddress": "tb1qexampleaddress...",
    "walletNetwork": "testnet"
  }
  \`\`\`
  *(roles: \`dealer\`, \`lender\`, \`customer\`)*
- **Response:**
  \`\`\`json
  {
    "success": true,
    "data": {
      "token": "eyJhbG...",
      "user": {
        "id": "...",
        "email": "dealer@example.com",
        "role": "dealer",
        "btcAddress": "tb1qexampleaddress...",
        "walletNetwork": "testnet"
      }
    }
  }
  \`\`\`

### Login
- **Method:** \`POST\`
- **Path:** \`/auth/login\`
- **Body:**
  \`\`\`json
  {
    "email": "dealer@example.com",
    "password": "password123"
  }
  \`\`\`
- **Response:**
  \`\`\`json
  {
    "success": true,
    "data": {
      "token": "eyJhbG...",
      "user": {
        "id": "...",
        "email": "dealer@example.com",
        "role": "dealer",
        "btcAddress": "tb1qexampleaddress...",
        "walletNetwork": "testnet"
      }
    }
  }
  \`\`\`

---

## 2. Dealer Module (Requires \`dealer\` role & Auth Token)

### List a Vehicle
- **Method:** \`POST\`
- **Path:** \`/dealer/vehicles\`
- **Body:**
  \`\`\`json
  {
    "make": "Toyota",
    "model": "Camry",
    "year": 2021,
    "vin": "1HGCM82633A",
    "priceBTC": 0.5
  }
  \`\`\`
  *(\`priceUSD\` is optional and auto-derived when omitted.)*
- **Response:**
  \`\`\`json
  {
    "success": true,
    "data": {
      "_id": "...",
      "make": "Toyota",
      "model": "Camry",
      "year": 2021,
      "vin": "1HGCM82633A",
      "priceBTC": 0.5,
      "priceUSD": 30000,
      "dealerId": "..."
    }
  }
  \`\`\`

### Get Dealer Inventory
- **Method:** \`GET\`
- **Path:** \`/dealer/vehicles\`
- **Response:** List of vehicles.

### Update Vehicle
- **Method:** \`PUT\`
- **Path:** \`/dealer/vehicles/:id\`
- **Body:** Any vehicle fields.
- **Response:** Updated vehicle.

### Delete Vehicle
- **Method:** \`DELETE\`
- **Path:** \`/dealer/vehicles/:id\`
- **Response:** \`{ "success": true, "data": {} }\`

### Accept Application
- **Method:** \`POST\`
- **Path:** \`/dealer/applications/:id/accept\`
- **Response:** Generates LoanAgreement and returns the accepted application and agreement data.

---

## 3. Lender Module (Requires \`lender\` role & Auth Token)

### Create Loan Offer
- **Method:** \`POST\`
- **Path:** \`/lender/offers\`
- **Body:**
  \`\`\`json
  {
    "amount": 0.4,
    "interestRate": 5.5,
    "repaymentScheduleMonths": 36,
    "collateralRequirement": "Vehicle Title"
  }
  \`\`\`
- **Response:** Created LoanOffer object.

### Get Offers
- **Method:** \`GET\`
- **Path:** \`/lender/offers\`
- **Response:** List of LoanOffers created by the lender.

### Update Offer
- **Method:** \`PUT\`
- **Path:** \`/lender/offers/:id\`
- **Body:** Fields to update.
- **Response:** Updated LoanOffer object.

### View Portfolio
- **Method:** \`GET\`
- **Path:** \`/lender/portfolio\`
- **Response:** List of \`LoanAgreements\` funded by this lender.

---

## 4. Customer Module (Requires Auth Token)

### Browse Marketplace
- **Method:** \`GET\`
- **Path:** \`/marketplace/vehicles\`
- **Response:** List of vehicles with attached \`availableOffers\`.

### Submit Application (Requires \`customer\` role)
- **Method:** \`POST\`
- **Path:** \`/customer/applications\`
- **Body:**
  \`\`\`json
  {
    "vehicleId": "...",
    "loanOfferId": "...",
    "downPaymentBTC": 0.1,
    "downPaymentTxId": "<64-char-hex-txid>",
    "kycHash": "0xABCDEF..."
  }
  \`\`\`
- **Response:** Created Application object with down payment verification metadata.

### Check Application Status (Requires \`customer\` role)
- **Method:** \`GET\`
- **Path:** \`/customer/applications/:id\`
- **Response:** Application object.

### View Repayments (Requires \`customer\` role)
- **Method:** \`GET\`
- **Path:** \`/customer/repayments\`
- **Response:** List of \`loans\` and payment \`history\`.

### Submit Repayment (Requires \`customer\` role)
- **Method:** \`POST\`
- **Path:** \`/customer/repayments/:loanId/pay\`
- **Body:** \`{ "amountBTC": 0.05, "txId": "<64-char-hex-txid>" }\`
- **Response:** Created Repayment record with on-chain verification metadata.

---

## 5. Escrow (Bitcoin Transaction Verified)

### Fund Escrow (Requires \`lender\` role & Auth Token)
- **Method:** \`POST\`
- **Path:** \`/escrow/:loanId/fund\`
- **Body:** \`{ "fundingTxId": "<64-char-hex-txid>", "escrowAddress": "tb1q..." }\`
- **Response:** Updated Escrow state plus funding verification data.

### Release Funds (Requires Auth Token)
- **Method:** \`POST\`
- **Path:** \`/escrow/:loanId/release\`
- **Body:** \`{ "releaseTxId": "<64-char-hex-txid>", "dealerReceiveAddress": "tb1q..." }\`
- **Response:** Updated Escrow state plus release verification data.

### Liquidate Collateral (Requires \`lender\` role & Auth Token)
- **Method:** \`POST\`
- **Path:** \`/escrow/:loanId/liquidate\`
- **Body:** \`{ "liquidationTxId": "<64-char-hex-txid>", "recipientAddress": "tb1q..." }\`
- **Response:** Updated Escrow state plus liquidation verification data.

---

## 6. Asset Registry Module (Public or Auth, Currently Auth via App routing)

### Register Vehicle
- **Method:** \`POST\`
- **Path:** \`/registry/vehicles\`
- **Body:** \`{ "vin": "...", "owner": "tb1qowner...", "loanId": "...", "txId": "<optional-txid>" }\`
- **Response:** Registry record.

### Lookup Collateral Status
- **Method:** \`GET\`
- **Path:** \`/registry/vehicles/:vin\`
- **Response:** Latest registry status and history array.

---

## 7. Oracle Simulation Service

### Vehicle Valuation
- **Method:** \`GET\`
- **Path:** \`/oracle/valuation/:vin\`
- **Response:** \`{ "success": true, "data": { "valueUSD": 25000, "valueBTC": 0.3846 } }\`

### Credit Score
- **Method:** \`GET\`
- **Path:** \`/oracle/creditScore/:customerId\`
- **Response:** \`{ "success": true, "data": { "creditScore": 720 } }\`

### Interest Rate
- **Method:** \`GET\`
- **Path:** \`/oracle/interestRate\`
- **Response:** \`{ "success": true, "data": { "interestRate": 5.5 } }\`
