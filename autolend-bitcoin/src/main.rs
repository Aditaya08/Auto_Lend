use serde::{Deserialize, Serialize};
use std::io::{self, Read};

mod multisig;
mod psbt;
mod regtest;
mod repayment;
mod rpc;
mod timelock;
mod wallet;

#[derive(Deserialize)]
struct Request {
    command: String,
    #[serde(flatten)]
    params: serde_json::Value,
}

#[derive(Serialize)]
struct Response {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();

    let mut input = String::new();
    if let Err(_) = io::stdin().read_to_string(&mut input) {
        respond_error("Failed to read stdin");
        return;
    }

    let req: Request = match serde_json::from_str(&input) {
        Ok(r) => r,
        Err(_) => {
            respond_error("Invalid JSON input");
            return;
        }
    };

    let result = match req.command.as_str() {
        "create_wallet" => wallet::create_wallet(req.params).await,
        "get_balance" => wallet::get_balance(req.params).await,
        "create_multisig" => multisig::create_multisig(req.params).await,
        "fund_escrow" => multisig::fund_escrow(req.params).await,
        "build_release_psbt" => psbt::build_release_psbt(req.params).await,
        "sign_psbt" => psbt::sign_psbt(req.params).await,
        "broadcast_psbt" => psbt::broadcast_psbt(req.params).await,
        "create_timelocked_script" => timelock::create_timelocked_script(req.params).await,
        "check_timelock" => timelock::check_timelock(req.params).await,
        "send_repayment" => repayment::send_repayment(req.params).await,
        "get_tx_status" => repayment::get_tx_status(req.params).await,
        #[cfg(feature = "regtest")]
        "mine_blocks" => regtest::mine_blocks(req.params).await,
        #[cfg(feature = "regtest")]
        "fund_address" => regtest::fund_address(req.params).await,
        _ => Err(format!("Unknown command: {}", req.command)),
    };

    match result {
        Ok(data) => respond_success(data),
        Err(e) => respond_error(&e),
    }
}

fn respond_success(data: serde_json::Value) {
    let res = Response {
        success: true,
        data: Some(data),
        error: None,
    };
    println!("{}", serde_json::to_string(&res).unwrap());
}

fn respond_error(err: &str) {
    let res = Response {
        success: false,
        data: None,
        error: Some(err.to_string()),
    };
    println!("{}", serde_json::to_string(&res).unwrap());
}
