import { address as bitcoinAddress, networks } from 'bitcoinjs-lib';

const SATOSHIS_PER_BTC = 100_000_000;

const NETWORK_CONFIG = {
    mainnet: {
        bitcoinjsNetwork: networks.bitcoin,
        defaultApiBaseUrl: 'https://mempool.space/api'
    },
    testnet: {
        bitcoinjsNetwork: networks.testnet,
        defaultApiBaseUrl: 'https://mempool.space/testnet/api'
    },
    signet: {
        bitcoinjsNetwork: networks.testnet,
        defaultApiBaseUrl: 'https://mempool.space/signet/api'
    },
    regtest: {
        bitcoinjsNetwork: networks.regtest,
        defaultApiBaseUrl: 'http://127.0.0.1:3006/api'
    }
};

const NETWORK_ALIASES = {
    bitcoin: 'mainnet',
    mainnet: 'mainnet',
    testnet: 'testnet',
    signet: 'signet',
    regtest: 'regtest'
};

export class BitcoinVerificationError extends Error {
    constructor(message, code = 'BITCOIN_VERIFICATION_FAILED', statusCode = 400, details = {}) {
        super(message);
        this.name = 'BitcoinVerificationError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}

const normalizeNetworkName = (networkName = process.env.BITCOIN_NETWORK || 'testnet') => {
    const normalized = NETWORK_ALIASES[String(networkName).toLowerCase()] || 'testnet';
    return normalized;
};

export const getBitcoinNetworkName = () => normalizeNetworkName();

export const getBitcoinjsNetwork = (networkName = getBitcoinNetworkName()) => {
    const normalized = normalizeNetworkName(networkName);
    return NETWORK_CONFIG[normalized].bitcoinjsNetwork;
};

export const getBitcoinApiBaseUrl = (networkName = getBitcoinNetworkName()) => {
    const normalized = normalizeNetworkName(networkName);
    return process.env.BITCOIN_API_BASE_URL || NETWORK_CONFIG[normalized].defaultApiBaseUrl;
};

export const getRequiredConfirmations = () => {
    const parsed = Number.parseInt(process.env.BITCOIN_REQUIRED_CONFIRMATIONS || '1', 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 1;
    }
    return parsed;
};

export const isOnChainEnforced = () => {
    const value = String(process.env.BITCOIN_ENFORCE_ONCHAIN ?? 'true').toLowerCase();
    return !['false', '0', 'off', 'no'].includes(value);
};

export const isValidBitcoinAddress = (candidate, networkName = getBitcoinNetworkName()) => {
    if (typeof candidate !== 'string' || candidate.trim().length < 14) {
        return false;
    }

    try {
        bitcoinAddress.toOutputScript(candidate.trim(), getBitcoinjsNetwork(networkName));
        return true;
    } catch {
        return false;
    }
};

export const isValidTxId = (txId) => {
    return typeof txId === 'string' && /^[a-fA-F0-9]{64}$/.test(txId);
};

export const btcToSats = (amountBTC) => {
    const amount = Number(amountBTC);
    if (!Number.isFinite(amount) || amount < 0) {
        throw new BitcoinVerificationError('BTC amount must be a non-negative number', 'INVALID_BTC_AMOUNT', 400);
    }
    return Math.round(amount * SATOSHIS_PER_BTC);
};

export const satsToBtc = (amountSats) => {
    const amount = Number(amountSats);
    if (!Number.isFinite(amount) || amount < 0) {
        throw new BitcoinVerificationError('Satoshis amount must be a non-negative number', 'INVALID_SATOSHI_AMOUNT', 400);
    }
    return amount / SATOSHIS_PER_BTC;
};

export const getUserBitcoinAddress = (user) => {
    if (!user) {
        return null;
    }
    return user.btcAddress || user.pubKey || null;
};

export const requireUserBitcoinAddress = (user, roleLabel = 'user') => {
    const address = getUserBitcoinAddress(user);
    if (!address) {
        throw new BitcoinVerificationError(
            `${roleLabel} does not have a Bitcoin address configured`,
            'BITCOIN_ADDRESS_MISSING',
            400
        );
    }
    return address;
};

const fetchJsonOrThrow = async (url) => {
    let response;
    try {
        response = await fetch(url, { headers: { accept: 'application/json' } });
    } catch (err) {
        throw new BitcoinVerificationError(
            `Unable to reach Bitcoin API at ${url}`,
            'BITCOIN_API_UNREACHABLE',
            503,
            { cause: err.message }
        );
    }

    if (!response.ok) {
        const text = await response.text();
        throw new BitcoinVerificationError(
            `Bitcoin API error (${response.status}) while calling ${url}`,
            'BITCOIN_API_HTTP_ERROR',
            503,
            { response: text }
        );
    }

    return response.json();
};

const fetchTextOrThrow = async (url) => {
    let response;
    try {
        response = await fetch(url, { headers: { accept: 'text/plain' } });
    } catch (err) {
        throw new BitcoinVerificationError(
            `Unable to reach Bitcoin API at ${url}`,
            'BITCOIN_API_UNREACHABLE',
            503,
            { cause: err.message }
        );
    }

    if (!response.ok) {
        const text = await response.text();
        throw new BitcoinVerificationError(
            `Bitcoin API error (${response.status}) while calling ${url}`,
            'BITCOIN_API_HTTP_ERROR',
            503,
            { response: text }
        );
    }

    return response.text();
};

export const getTransaction = async (txId, networkName = getBitcoinNetworkName()) => {
    if (!isValidTxId(txId)) {
        throw new BitcoinVerificationError('Invalid transaction id format', 'INVALID_TX_ID', 400);
    }

    const apiBaseUrl = getBitcoinApiBaseUrl(networkName);
    return fetchJsonOrThrow(`${apiBaseUrl}/tx/${txId}`);
};

export const getTransactionStatus = async (txId, networkName = getBitcoinNetworkName()) => {
    if (!isValidTxId(txId)) {
        throw new BitcoinVerificationError('Invalid transaction id format', 'INVALID_TX_ID', 400);
    }

    const apiBaseUrl = getBitcoinApiBaseUrl(networkName);
    return fetchJsonOrThrow(`${apiBaseUrl}/tx/${txId}/status`);
};

export const getCurrentTipHeight = async (networkName = getBitcoinNetworkName()) => {
    const apiBaseUrl = getBitcoinApiBaseUrl(networkName);
    const tip = await fetchTextOrThrow(`${apiBaseUrl}/blocks/tip/height`);
    const parsed = Number.parseInt(tip, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new BitcoinVerificationError('Could not parse current Bitcoin tip height', 'BITCOIN_TIP_UNAVAILABLE', 503);
    }
    return parsed;
};

const getConfirmations = ({ status, tipHeight }) => {
    if (!status || !status.confirmed || !status.block_height || !Number.isFinite(tipHeight)) {
        return 0;
    }

    const confirmations = tipHeight - status.block_height + 1;
    if (!Number.isFinite(confirmations) || confirmations < 0) {
        return 0;
    }

    return confirmations;
};

export const verifyBitcoinPayment = async ({
    txId,
    recipientAddress,
    minAmountBTC,
    networkName = getBitcoinNetworkName(),
    requiredConfirmations = getRequiredConfirmations(),
    strict = isOnChainEnforced()
}) => {
    if (!isValidTxId(txId)) {
        throw new BitcoinVerificationError('Invalid transaction id format', 'INVALID_TX_ID', 400);
    }

    if (!isValidBitcoinAddress(recipientAddress, networkName)) {
        throw new BitcoinVerificationError('Invalid Bitcoin address', 'INVALID_BITCOIN_ADDRESS', 400);
    }

    const minAmountSats = btcToSats(minAmountBTC);

    let tx;
    let status;
    let tipHeight;

    try {
        [tx, status, tipHeight] = await Promise.all([
            getTransaction(txId, networkName),
            getTransactionStatus(txId, networkName),
            getCurrentTipHeight(networkName)
        ]);
    } catch (err) {
        if (strict) {
            if (err instanceof BitcoinVerificationError) {
                throw err;
            }

            throw new BitcoinVerificationError(
                `Failed to verify Bitcoin transaction ${txId}`,
                'BITCOIN_VERIFICATION_ERROR',
                503,
                { cause: err.message }
            );
        }

        return {
            txId,
            verified: false,
            recipientAddress,
            paidAmountBTC: 0,
            paidAmountSats: 0,
            requiredAmountBTC: Number(minAmountBTC),
            requiredAmountSats: minAmountSats,
            confirmations: 0,
            requiredConfirmations,
            network: normalizeNetworkName(networkName),
            confirmed: false,
            reason: err.message || 'Unknown verification error'
        };
    }

    const outputs = Array.isArray(tx.vout) ? tx.vout : [];
    const matchingOutputs = outputs.filter((output) => output.scriptpubkey_address === recipientAddress);
    const paidAmountSats = matchingOutputs.reduce((sum, output) => sum + Number(output.value || 0), 0);
    const paidAmountBTC = satsToBtc(paidAmountSats);

    const confirmations = getConfirmations({ status, tipHeight });
    const hasMatchingOutput = matchingOutputs.length > 0;
    const amountSatisfied = hasMatchingOutput && paidAmountSats >= minAmountSats;
    const confirmationsSatisfied = confirmations >= requiredConfirmations;

    if (strict && !amountSatisfied) {
        throw new BitcoinVerificationError(
            `Transaction ${txId} does not pay at least ${minAmountBTC} BTC to ${recipientAddress}`,
            'BITCOIN_OUTPUT_AMOUNT_TOO_LOW',
            400,
            { paidAmountBTC, minAmountBTC }
        );
    }

    if (strict && !confirmationsSatisfied) {
        throw new BitcoinVerificationError(
            `Transaction ${txId} has ${confirmations} confirmations, required ${requiredConfirmations}`,
            'BITCOIN_TX_UNCONFIRMED',
            400,
            { confirmations, requiredConfirmations }
        );
    }

    return {
        txId,
        verified: amountSatisfied && confirmationsSatisfied,
        recipientAddress,
        paidAmountBTC,
        paidAmountSats,
        requiredAmountBTC: Number(minAmountBTC),
        requiredAmountSats: minAmountSats,
        confirmations,
        requiredConfirmations,
        network: normalizeNetworkName(networkName),
        confirmed: Boolean(status.confirmed),
        blockHeight: status.block_height || null,
        blockHash: status.block_hash || null,
        blockTime: status.block_time || null,
        hasMatchingOutput,
        outputCount: matchingOutputs.length
    };
};
