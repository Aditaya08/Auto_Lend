import crypto from 'crypto';

export const getVehicleValuation = (vin) => {
  // Deterministic mock based on VIN
  const hash = crypto.createHash('sha256').update(vin).digest('hex');
  const valueUSD = (parseInt(hash.substring(0, 4), 16) % 40000) + 10000; // Between 10k and 50k
  const valueBTC = valueUSD / 65000; // Assuming 1 BTC = 65k USD
  
  return { valueUSD, valueBTC: parseFloat(valueBTC.toFixed(4)) };
};

export const getCreditScore = (customerId) => {
  // Deterministic mock based on customerId
  const hash = crypto.createHash('sha256').update(customerId.toString()).digest('hex');
  const score = (parseInt(hash.substring(0, 4), 16) % 550) + 300; // Between 300 and 850
  
  return score;
};

export const getMarketInterestRate = () => {
  // Static mock or slightly randomized
  return 5.5; // 5.5%
};
