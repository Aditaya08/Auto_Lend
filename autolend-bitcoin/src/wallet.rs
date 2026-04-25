use bdk::database::MemoryDatabase;
use bdk::Wallet;
use bitcoin::secp256k1::rand;
use bitcoin::secp256k1::Secp256k1;
use bitcoin::Network;
use serde_json::{json, Value};
use std::str::FromStr;

fn get_network() -> Network {
    Network::Regtest
}

pub async fn create_wallet(_params: Value) -> Result<Value, String> {
    let secp = Secp256k1::new();
    let mut rng = rand::thread_rng();
    let (secret_key, public_key) = secp.generate_keypair(&mut rng);

    let privkey_wif = bitcoin::PrivateKey {
        compressed: true,
        network: get_network(),
        inner: secret_key,
    }
    .to_wif();

    let descriptor = format!("wpkh({})", privkey_wif);
    
    let wallet = Wallet::new(
        &descriptor,
        None,
        get_network(),
        MemoryDatabase::default(),
    )
    .map_err(|e| e.to_string())?;

    let address = wallet
        .get_address(bdk::wallet::AddressIndex::New)
        .map_err(|e| e.to_string())?
        .address
        .to_string();

    Ok(json!({
        "public_key": public_key.to_string(),
        "address": address,
        "descriptor": descriptor,
    }))
}

pub async fn get_balance(params: Value) -> Result<Value, String> {
    let address_str = params
        .get("address")
        .and_then(|v| v.as_str())
        .ok_or("Missing address")?;

    let address = bitcoin::Address::from_str(address_str)
        .map_err(|e| format!("Invalid address: {}", e))?
        .require_network(get_network())
        .map_err(|e| format!("Address network mismatch: {}", e))?;

    let rpc = crate::rpc::get_rpc()?;
    
    // getaddressinfo doesn't easily give balance if it's not in the bitcoind wallet.
    // actually we can use scantxoutset or importaddress to get balance.
    // A simpler way for regtest is to just use importaddress and then getbalances,
    // or just scanunspent.
    // Let's use get_descriptor_info and importdescriptors if needed, or simply `scantxoutset`.
    // Wait, BDK can sync via electrum, but the prompt says we use bitcoind RPC.
    // Oh, the prompt says `bdk = { version = "1.0", features = ["electrum"] }`. 
    // And "rpc.rs <- bitcoind RPC client".
    // I will use bitcoincore-rpc to call `scantxoutset`.
    
    use bitcoincore_rpc::RpcApi;
    
    // We can also just use BDK with an Electrum server if it's running, 
    // but the prompt's `scripts/setup-regtest.sh` only runs bitcoind.
    // So we must use bitcoind RPC for get_balance.
    let _desc = format!("addr({})", address);
    
    // Import address to bitcoind so it tracks it (as watchonly)
    // We can use importaddress
    let _ = rpc.import_address(&address, Some("autolend"), Some(false));
    
    // Wait for a tiny bit if needed, then get balance.
    // But bitcoincore-rpc `get_balance` doesn't take an address.
    // We can use `list_unspent` and filter by address.
    let unspent = rpc
        .list_unspent(
            Some(0),
            Some(9999999),
            Some(&[&address]),
            None,
            None,
        )
        .map_err(|e| format!("RPC error: {}", e))?;

    let mut confirmed_btc = 0.0;
    let mut unconfirmed_btc = 0.0;

    for utxo in unspent {
        let amt = utxo.amount.to_btc();
        if utxo.confirmations > 0 {
            confirmed_btc += amt;
        } else {
            unconfirmed_btc += amt;
        }
    }

    Ok(json!({
        "confirmed_btc": confirmed_btc,
        "unconfirmed_btc": unconfirmed_btc,
    }))
}
