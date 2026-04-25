use serde_json::{json, Value};
use bitcoin::{Address, PublicKey, Network};
use bitcoin::blockdata::script::Builder;
use bitcoin::blockdata::opcodes;
use bitcoincore_rpc::RpcApi;
use std::str::FromStr;

pub async fn create_multisig(params: Value) -> Result<Value, String> {
    let dealer_pk_str = params.get("dealer_pk").and_then(|v| v.as_str()).ok_or("Missing dealer_pk")?;
    let lender_pk_str = params.get("lender_pk").and_then(|v| v.as_str()).ok_or("Missing lender_pk")?;
    let customer_pk_str = params.get("customer_pk").and_then(|v| v.as_str()).ok_or("Missing customer_pk")?;

    let dealer_pk = PublicKey::from_str(dealer_pk_str).map_err(|e| e.to_string())?;
    let lender_pk = PublicKey::from_str(lender_pk_str).map_err(|e| e.to_string())?;
    let customer_pk = PublicKey::from_str(customer_pk_str).map_err(|e| e.to_string())?;

    let redeem_script = Builder::new()
        .push_opcode(opcodes::all::OP_PUSHNUM_2)
        .push_key(&dealer_pk)
        .push_key(&lender_pk)
        .push_key(&customer_pk)
        .push_opcode(opcodes::all::OP_PUSHNUM_3)
        .push_opcode(opcodes::all::OP_CHECKMULTISIG)
        .into_script();

    let escrow_address = Address::p2wsh(&redeem_script, Network::Regtest);

    Ok(json!({
        "escrow_address": escrow_address.to_string(),
        "redeem_script": hex::encode(redeem_script.as_bytes())
    }))
}

pub async fn fund_escrow(params: Value) -> Result<Value, String> {
    let escrow_address_str = params.get("escrow_address").and_then(|v| v.as_str()).ok_or("Missing escrow_address")?;
    let amount_btc = params.get("amount_btc").and_then(|v| v.as_f64()).ok_or("Missing amount_btc")?;
    let descriptor = params.get("lender_descriptor").and_then(|v| v.as_str()).ok_or("Missing lender_descriptor")?;

    // The descriptor is wpkh(WIF). We extract the WIF.
    let wif_str = descriptor.replace("wpkh(", "").replace(")", "");
    let privkey = bitcoin::PrivateKey::from_str(&wif_str).map_err(|e| e.to_string())?;

    let rpc = crate::rpc::get_rpc()?;

    // To spend, we import the privkey to bitcoind with rescan=false first.
    // Actually, bitcoind might not be able to spend it unless it's imported.
    // If it's the lender, the address was already funded. 
    // To be safe, we import it without rescan (assuming the fund_address imported it as watch-only, or we do it now with rescan).
    // Actually, the prompt flow:
    // 1. create_wallet
    // 2. fund_address (lender)
    // 3. mine_blocks
    // If we call fund_address, it sends from bitcoind default wallet to lender address.
    // Wait, bitcoind knows the UTXO but doesn't have the privkey.
    // Let's import the privkey into bitcoind, then use `sendtoaddress`.
    let label = format!("lender_{}", escrow_address_str[0..8].to_string());
    
    // bitcoincore-rpc 0.17 requires: import_priv_key(privkey, label, rescan)
    rpc.import_private_key(&privkey, Some(&label), Some(true)).map_err(|e| format!("Import fail: {}", e))?;

    // Now bitcoind can spend from this address.
    let amount = bitcoin::Amount::from_btc(amount_btc).map_err(|e| e.to_string())?;
    let escrow_address = Address::from_str(escrow_address_str).map_err(|e| e.to_string())?.require_network(Network::Regtest).map_err(|e| e.to_string())?;

    let txid = rpc.send_to_address(&escrow_address, amount, None, None, None, None, None, None).map_err(|e| format!("Send fail: {}", e))?;

    Ok(json!({
        "txid": txid.to_string()
    }))
}
