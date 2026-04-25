use serde_json::{json, Value};
use bitcoin::{Address, Network};
use bitcoincore_rpc::RpcApi;
use std::str::FromStr;

pub async fn send_repayment(params: Value) -> Result<Value, String> {
    let customer_descriptor = params.get("customer_descriptor").and_then(|v| v.as_str()).ok_or("Missing customer_descriptor")?;
    let lender_address_str = params.get("lender_address").and_then(|v| v.as_str()).ok_or("Missing lender_address")?;
    let amount_btc = params.get("amount_btc").and_then(|v| v.as_f64()).ok_or("Missing amount_btc")?;

    let wif_str = customer_descriptor.replace("wpkh(", "").replace(")", "");
    let privkey = bitcoin::PrivateKey::from_str(&wif_str).map_err(|e| e.to_string())?;

    let rpc = crate::rpc::get_rpc()?;
    
    // Import the signer's privkey temporarily into bitcoind.
    let _ = rpc.import_private_key(&privkey, Some("customer"), Some(true));

    let lender_address = Address::from_str(lender_address_str).map_err(|e| e.to_string())?.require_network(Network::Regtest).map_err(|e| e.to_string())?;
    let amount = bitcoin::Amount::from_btc(amount_btc).map_err(|e| e.to_string())?;

    let txid = rpc.send_to_address(&lender_address, amount, None, None, None, None, None, None).map_err(|e| format!("Repayment fail: {}", e))?;

    Ok(json!({
        "txid": txid.to_string()
    }))
}

pub async fn get_tx_status(params: Value) -> Result<Value, String> {
    let txid_str = params.get("txid").and_then(|v| v.as_str()).ok_or("Missing txid")?;
    let txid = bitcoin::Txid::from_str(txid_str).map_err(|e| e.to_string())?;

    let rpc = crate::rpc::get_rpc()?;
    
    let tx_info = rpc.get_raw_transaction_info(&txid, None).map_err(|e| e.to_string())?;
    
    let confirmations = tx_info.confirmations.unwrap_or(0);
    
    Ok(json!({
        "confirmed": confirmations > 0,
        "confirmations": confirmations
    }))
}
