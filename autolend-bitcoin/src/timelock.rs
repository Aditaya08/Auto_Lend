use serde_json::{json, Value};
use bitcoin::{Address, PublicKey, Network};
use bitcoin::blockdata::script::Builder;
use bitcoin::blockdata::opcodes;
use bitcoincore_rpc::RpcApi;
use std::str::FromStr;

pub async fn create_timelocked_script(params: Value) -> Result<Value, String> {
    let dealer_pk_str = params.get("dealer_pk").and_then(|v| v.as_str()).ok_or("Missing dealer_pk")?;
    let lender_pk_str = params.get("lender_pk").and_then(|v| v.as_str()).ok_or("Missing lender_pk")?;
    let customer_pk_str = params.get("customer_pk").and_then(|v| v.as_str()).ok_or("Missing customer_pk")?;
    let locktime_blocks = params.get("locktime_blocks").and_then(|v| v.as_i64()).ok_or("Missing locktime_blocks")?;

    let dealer_pk = PublicKey::from_str(dealer_pk_str).map_err(|e| e.to_string())?;
    let lender_pk = PublicKey::from_str(lender_pk_str).map_err(|e| e.to_string())?;
    let customer_pk = PublicKey::from_str(customer_pk_str).map_err(|e| e.to_string())?;

    // <locktime_blocks> OP_CHECKLOCKTIMEVERIFY OP_DROP OP_2 <pk1> <pk2> <pk3> OP_3 OP_CHECKMULTISIG
    let script = Builder::new()
        .push_int(locktime_blocks)
        .push_opcode(opcodes::all::OP_CLTV)
        .push_opcode(opcodes::all::OP_DROP)
        .push_opcode(opcodes::all::OP_PUSHNUM_2)
        .push_key(&dealer_pk)
        .push_key(&lender_pk)
        .push_key(&customer_pk)
        .push_opcode(opcodes::all::OP_PUSHNUM_3)
        .push_opcode(opcodes::all::OP_CHECKMULTISIG)
        .into_script();

    let address = Address::p2wsh(&script, Network::Regtest);

    Ok(json!({
        "script": hex::encode(script.as_bytes()),
        "address": address.to_string()
    }))
}

pub async fn check_timelock(params: Value) -> Result<Value, String> {
    let locktime_blocks = params.get("locktime_blocks").and_then(|v| v.as_u64()).ok_or("Missing locktime_blocks")?;
    let funded_at_block = params.get("funded_at_block").and_then(|v| v.as_u64()).ok_or("Missing funded_at_block")?;

    let rpc = crate::rpc::get_rpc()?;
    
    let current_block = rpc.get_block_count().map_err(|e| e.to_string())?;
    
    let target_block = funded_at_block + locktime_blocks;
    
    let expired = current_block >= target_block;
    let blocks_remaining = if expired { 0 } else { target_block - current_block };

    Ok(json!({
        "expired": expired,
        "blocks_remaining": blocks_remaining
    }))
}
