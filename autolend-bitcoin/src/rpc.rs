use bitcoincore_rpc::{Auth, Client};
use std::env;

pub fn get_rpc() -> Result<Client, String> {
    let rpc_url = env::var("BITCOIN_RPC_URL").unwrap_or_else(|_| "http://127.0.0.1:18443".to_string());
    let rpc_user = env::var("BITCOIN_RPC_USER").unwrap_or_else(|_| "autolend".to_string());
    let rpc_pass = env::var("BITCOIN_RPC_PASS").unwrap_or_else(|_| "autolend123".to_string());

    Client::new(&rpc_url, Auth::UserPass(rpc_user, rpc_pass))
        .map_err(|e| format!("Failed to create RPC client: {}", e))
}
