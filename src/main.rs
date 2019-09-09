use std::error::Error;
use std::fs::File;
use std::io::Read;
use std::path::Path;
use std::process;

use futures::Future;
use ruma_client::{self, Client};
use serde::{Deserialize, Serialize};
use url::Url;

type BotResult<T> = Result<T, Box<dyn Error>>;

#[derive(Serialize, Deserialize)]
struct MatrixConfig {
    server_url: String,
    username: String,
    password: String,
}

#[derive(Serialize, Deserialize)]
struct Config {
    matrix: MatrixConfig,
}

fn parse_config(path: &Path) -> BotResult<Config> {
    let mut file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    let config = toml::from_str(&contents)?;
    Ok(config)
}

fn run_matrix(
    config: MatrixConfig,
    server_url: Url,
) -> impl Future<Item = (), Error = ruma_client::Error> {
    let client = Client::https(server_url, None).unwrap();

    client
        .log_in(config.username, config.password, None)
        .and_then(|session| {
            // TODO?
            Ok(())
        })
}

fn main() {
    let config = match parse_config(Path::new("./credentials.toml")) {
        Ok(config) => config,
        Err(err) => {
            eprintln!("Error when reading configuration: {}", err);
            process::exit(1);
        }
    };

    let matrix_server_url =
        Url::parse(&config.matrix.server_url).expect("invalid Matrix server URL");

    tokio::run(run_matrix(config.matrix, matrix_server_url).map_err(|err| {
        eprintln!("Error when running Matrix: {:?}", err);
    }));
}
