use std::{env, sync::Arc};

use anyhow::Context;
use matrix_sdk::{
    config::SyncSettings,
    event_handler::Ctx,
    room::{Joined, Room},
    ruma::{
        events::room::{
            member::StrippedRoomMemberEvent,
            message::{MessageType, RoomMessageEventContent, SyncRoomMessageEvent},
        },
        UserId,
    },
    Client,
};
use tokio::{
    sync::Mutex,
    time::{sleep, Duration},
};

struct BotConfig {
    home_server: String,
    user_id: String,
    password: String,
    matrix_store_path: String,
}

fn get_config() -> anyhow::Result<BotConfig> {
    // override environment variables with contents of .env file, unless they were already set
    // explicitly.
    dotenvy::dotenv().ok();

    let home_server = env::var("HOMESERVER").context("missing HOMESERVER variable")?;
    let user_id = env::var("BOT_USER_ID").context("missing bot user id in BOT_USER_ID")?;
    let password = env::var("BOT_PWD").context("missing bot user id in BOT_PWD")?;
    let matrix_store_path = env::var("MATRIX_STORE_PATH").context("missing MATRIX_STORE_PATH")?;

    Ok(BotConfig {
        home_server,
        user_id,
        password,
        matrix_store_path,
    })
}

#[derive(Default)]
struct AppCtx {
    client: reqwest::Client,
}

#[derive(Clone)]
struct App {
    inner: Arc<Mutex<AppCtx>>,
}

impl App {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(AppCtx::default())),
        }
    }
}

async fn gen_uuid(msg: &str, _from: &UserId, room: &Joined) -> anyhow::Result<bool> {
    if !msg.starts_with("!uuid") {
        return Ok(false);
    }

    let uuid = uuid::Uuid::new_v4();
    let text = RoomMessageEventContent::text_plain(format!("{uuid}"));

    room.send(text, None).await?;

    Ok(true)
}

async fn get_pun(ctx: &AppCtx, msg: &str, _from: &UserId, room: &Joined) -> anyhow::Result<bool> {
    if !msg.starts_with("!pun") {
        return Ok(false);
    }

    const URL: &str = "https://icanhazdadjoke.com/";

    let req = ctx
        .client
        .get(URL)
        .header("Accept", "application/json")
        .build()?;

    #[derive(serde::Deserialize)]
    struct Response {
        joke: String,
    }

    let response: Response = ctx.client.execute(req).await?.json().await?;

    let joke = response.joke;

    let text = RoomMessageEventContent::text_plain(format!("{joke}"));
    room.send(text, None).await?;

    Ok(true)
}

async fn on_message(
    ev: SyncRoomMessageEvent,
    room: Room,
    client: Client,
    Ctx(ctx): Ctx<App>,
) -> anyhow::Result<()> {
    let room = if let Room::Joined(room) = room {
        room
    } else {
        // Ignore non-joined rooms events.
        return Ok(());
    };

    if ev.sender() == client.user_id().unwrap() {
        // Skip messages sent by the bot.
        return Ok(());
    }

    if let Some(ref unredacted) = ev.as_original() {
        let content = if let MessageType::Text(text) = &unredacted.content.msgtype {
            text.body.as_str()
        } else {
            // Ignore other kinds of messages at the moment.
            return Ok(());
        };

        tracing::trace!(
            "Received a message from {} in {}: {}",
            ev.sender(),
            room.room_id(),
            content,
        );

        match gen_uuid(&content, ev.sender(), &room).await {
            Ok(res) => {
                if res {
                    return Ok(());
                }
            }
            Err(err) => {
                tracing::warn!("gen_uuid caused an error: {err}");
            }
        }

        {
            // TODO ohnoes, locking across other awaits is bad
            // Might be better that each handler gets its own state and lock instead, to minimize
            // contention.
            let ctx = ctx.inner.lock().await;
            match get_pun(&ctx, &content, ev.sender(), &room).await {
                Ok(res) => {
                    if res {
                        return Ok(());
                    }
                }
                Err(err) => {
                    tracing::warn!("get_pun caused an error: {err}");
                }
            }
        }
    }

    Ok(())
}

/// Autojoin mixin.
async fn on_stripped_state_member(
    room_member: StrippedRoomMemberEvent,
    client: Client,
    room: Room,
) {
    if room_member.state_key != client.user_id().unwrap() {
        // the invite we've seen isn't for us, but for someone else. ignore
        return;
    }

    // looks like the room is an invited room, let's attempt to join then
    if let Room::Invited(room) = room {
        // The event handlers are called before the next sync begins, but
        // methods that change the state of a room (joining, leaving a room)
        // wait for the sync to return the new room state so we need to spawn
        // a new task for them.
        tokio::spawn(async move {
            tracing::debug!("Autojoining room {}", room.room_id());
            let mut delay = 1;

            while let Err(err) = room.accept_invitation().await {
                // retry autojoin due to synapse sending invites, before the
                // invited user can join for more information see
                // https://github.com/matrix-org/synapse/issues/4345
                tracing::warn!(
                    "Failed to join room {} ({err:?}), retrying in {delay}s",
                    room.room_id()
                );

                sleep(Duration::from_secs(delay)).await;
                delay *= 2;

                if delay > 3600 {
                    tracing::error!("Can't join room {} ({err:?})", room.room_id());
                    break;
                }
            }

            tracing::debug!("Successfully joined room {}", room.room_id());
        });
    }
}

async fn real_main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    tracing::debug!("parsing config...");
    let config = get_config()?;

    tracing::debug!("creating client...");
    let client = Client::builder()
        .server_name(config.home_server.as_str().try_into()?)
        .sled_store(&config.matrix_store_path, None)?
        .build()
        .await?;

    // First we need to log in.
    tracing::debug!("logging in...");
    client
        .login_username(&config.user_id, &config.password)
        .send()
        .await?;

    client
        .user_id()
        .context("missing user id for the logged in bot?")?;

    // An initial sync to set up state and so our bot doesn't respond to old
    // messages. If the `StateStore` finds saved state in the location given the
    // initial sync will be skipped in favor of loading state from the store
    tracing::debug!("starting initial sync...");
    client.sync_once(SyncSettings::default()).await.unwrap();

    tracing::debug!("initial sync done! now listening to all the messages");
    client.add_event_handler_context(App::new());
    client.add_event_handler(on_message);
    client.add_event_handler(on_stripped_state_member);

    // Note: this method will never return.
    let sync_settings = SyncSettings::default().token(client.sync_token().await.unwrap());
    client.sync(sync_settings).await?;

    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // just one trick to get rust-analyzer working in main :-)
    real_main().await
}
