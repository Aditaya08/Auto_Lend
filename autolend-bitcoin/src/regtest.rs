use serde_json::{json, Value};
use bitcoincore_rpc::RpcApi;
use bitcoin::Address;
use std::str::FromStr;

pub async fn mine_blocks(params: Value) -> Result<Value, String> {
    let count = params
        .get("count")
        .and_then(|v| v.as_u64())
        .ok_or("Missing or invalid 'count'")?;

    let rpc = crate::rpc::get_rpc()?;
    
    // bitcoind needs a new address to mine blocks to
    let address = rpc.get_new_address(None, None).map_err(|e| e.to_string())?.assume_checked();

    let blocks = rpc.generate_to_address(count, &address).map_err(|e| e.to_string())?;

    let new_block_height = rpc.get_block_count().map_err(|e| e.to_string())?;

    Ok(json!({
        "mined_hashes": blocks,
        "new_block_height": new_block_height
    }))
}

pub async fn fund_address(params: Value) -> Result<Value, String> {
    let address_str = params
        .get("address")
        .and_then(|v| v.as_str())
        .ok_or("Missing address")?;
        
    let amount_btc = params
        .get("amount_btc")
        .and_then(|v| v.as_f64())
        .ok_or("Missing amount_btc")?;

    let address = Address::from_str(address_str)
        .map_err(|e| e.to_string())?
        .require_network(bitcoin::Network::Regtest)
        .map_err(|e| e.to_string())?;

    let rpc = crate::rpc::get_rpc()?;
    
    let amount = bitcoin::Amount::from_btc(amount_btc).map_err(|e| e.to_string())?;
    
    let txid = rpc.send_to_address(&address, amount, None, None, None, None, None, None).map_err(|e| e.to_string())?;

    Ok(json!({
        "txid": txid.to_string()
    }))
}
