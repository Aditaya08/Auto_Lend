use serde_json::{json, Value};
use bitcoin::{Address, Network, Transaction};
use bitcoincore_rpc::RpcApi;
use std::str::FromStr;

pub async fn build_release_psbt(params: Value) -> Result<Value, String> {
    let escrow_address_str = params.get("escrow_address").and_then(|v| v.as_str()).ok_or("Missing escrow_address")?;
    let dealer_address_str = params.get("dealer_address").and_then(|v| v.as_str()).ok_or("Missing dealer_address")?;
    let _amount_btc = params.get("amount_btc").and_then(|v| v.as_f64()).ok_or("Missing amount_btc")?;
    let redeem_script_hex = params.get("redeem_script").and_then(|v| v.as_str()).ok_or("Missing redeem_script")?;

    let escrow_address = Address::from_str(escrow_address_str).map_err(|e| e.to_string())?.require_network(Network::Regtest).map_err(|e| e.to_string())?;
    let dealer_address = Address::from_str(dealer_address_str).map_err(|e| e.to_string())?.require_network(Network::Regtest).map_err(|e| e.to_string())?;

    let rpc = crate::rpc::get_rpc()?;

    let _ = rpc.import_address(&escrow_address, Some("escrow"), Some(false));
    let unspent = rpc.list_unspent(Some(0), Some(9999999), Some(&[&escrow_address]), None, None).map_err(|e| e.to_string())?;

    if unspent.is_empty() {
        return Err("No UTXOs found for escrow address".to_string());
    }

    let utxo = &unspent[0];
    
    use bitcoin::psbt::Psbt;
    use bitcoin::{TxIn, TxOut, OutPoint, Sequence, Witness};
    
    let txin = TxIn {
        previous_output: OutPoint { txid: utxo.txid, vout: utxo.vout },
        script_sig: bitcoin::ScriptBuf::new(),
        sequence: Sequence::MAX,
        witness: Witness::new(),
    };

    let fee = bitcoin::Amount::from_sat(1000);
    let send_amount = utxo.amount.checked_sub(fee).ok_or("Amount too small for fee")?;

    let txout = TxOut {
        value: send_amount.to_sat(),
        script_pubkey: dealer_address.script_pubkey(),
    };

    let tx = Transaction {
        version: 2,
        lock_time: bitcoin::absolute::LockTime::ZERO,
        input: vec![txin],
        output: vec![txout],
    };

    let mut psbt = Psbt::from_unsigned_tx(tx).map_err(|e| e.to_string())?;

    let redeem_script_bytes = hex::decode(redeem_script_hex).map_err(|e| e.to_string())?;
    let redeem_script = bitcoin::ScriptBuf::from(redeem_script_bytes);

    psbt.inputs[0].witness_script = Some(redeem_script);
    psbt.inputs[0].witness_utxo = Some(TxOut {
        value: utxo.amount.to_sat(),
        script_pubkey: escrow_address.script_pubkey(),
    });

    Ok(json!({
        "psbt_base64": psbt.to_string()
    }))
}

pub async fn sign_psbt(params: Value) -> Result<Value, String> {
    let psbt_base64 = params.get("psbt_base64").and_then(|v| v.as_str()).ok_or("Missing psbt_base64")?;
    let descriptor = params.get("signer_descriptor").and_then(|v| v.as_str()).ok_or("Missing signer_descriptor")?;

    let wif_str = descriptor.replace("wpkh(", "").replace(")", "");
    let privkey = bitcoin::PrivateKey::from_str(&wif_str).map_err(|e| e.to_string())?;

    let rpc = crate::rpc::get_rpc()?;
    
    // Import the signer's privkey temporarily into bitcoind so bitcoind can sign the PSBT.
    let _ = rpc.import_private_key(&privkey, Some("temp_signer"), Some(false));

    // Sign the PSBT
    let sign_res = rpc.wallet_process_psbt(psbt_base64, Some(true), None, Some(true)).map_err(|e| e.to_string())?;

    Ok(json!({
        "psbt_base64": sign_res.psbt
    }))
}

pub async fn broadcast_psbt(params: Value) -> Result<Value, String> {
    let psbt_base64 = params.get("psbt_base64").and_then(|v| v.as_str()).ok_or("Missing psbt_base64")?;

    let rpc = crate::rpc::get_rpc()?;
    
    let finalize_res = rpc.finalize_psbt(psbt_base64, None).map_err(|e| e.to_string())?;

    if let Some(hex) = finalize_res.hex {
        // Send raw transaction
        let tx: Transaction = bitcoin::consensus::encode::deserialize(&hex).map_err(|e| e.to_string())?;
        let txid = rpc.send_raw_transaction(&tx).map_err(|e| format!("Broadcast fail: {}", e))?;
        Ok(json!({
            "txid": txid.to_string()
        }))
    } else {
        Err("Failed to finalize PSBT (perhaps missing signatures?)".to_string())
    }
}
