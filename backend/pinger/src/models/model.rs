use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
#[serde(untagged)]
pub enum Description {
    Component(TextComponent),
    Plain(String),
}

#[derive(Serialize, Deserialize)]
#[serde(untagged)]
pub enum TextComponent {
    Object {
        #[serde(default)]
        text: String,
        color: Option<String>,
        extra: Option<Vec<TextComponent>>,
    },
    String(String),
    Array(Vec<TextComponent>),
}

impl Description {
    pub fn to_plain_text(&self) -> String {
        match self {
            Description::Plain(s) => s.to_owned(),
            // Description::Plain(s) => strip_paragraph_codes(s), // virer les §x
            Description::Component(c) => c.to_plain_text(),
        }
    }
}

impl TextComponent {
    pub fn to_plain_text(&self) -> String {
        match self {
            TextComponent::Object { text, extra, .. } => {
                let mut result = text.clone();
                if let Some(extras) = extra {
                    for extra in extras {
                        result.push_str(&extra.to_plain_text());
                    }
                }
                result
            },
            TextComponent::String(s) => s.clone(),
            TextComponent::Array(arr) => {
                arr.iter().map(|c| c.to_plain_text()).collect::<String>()
            }
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct PingResponse {
    pub version: Version,
    pub players: Players,
    pub description: Description,
    pub favicon: Option<String>,
}

impl PingResponse {
    pub fn debug_infos(&self) {
        println!("Version :");
        println!(" - name: {}", self.version.name);
        println!(" - protocol: {}", self.version.protocol);
        println!("Players :");
        println!(" - online: {}", self.players.online);
        println!(" - max: {}", self.players.max);

        if let Some(sample) = &self.players.sample {
            println!(" - sample:");
            for player in sample {
                println!("   - name: {}, id: {}", player.name, player.id);
            }
        }

        println!("Description: {}", self.description.to_plain_text());
        println!("Favicon: {}", self.favicon.as_deref().unwrap_or("None"));
    }
}

#[derive(Serialize, Deserialize)]
pub struct Version {
    pub name: String,
    pub protocol: i32,
}

#[derive(Serialize, Deserialize)]
pub struct Players {
    pub online: u32,
    pub max: i32,
    pub sample: Option<Vec<PlayerInfo>>,
}

#[derive(Serialize, Deserialize)]
pub struct PlayerInfo {
    pub name: String,
    pub id: String,
}

#[derive(Serialize, Deserialize)]
pub struct ModInfo {
    #[serde(rename = "type")]
    pub name: String,
    #[serde(rename = "modList")]
    pub mod_list: Vec<ModInfo>,
}

#[derive(Serialize, Deserialize)]
pub struct Mod {
    #[serde(rename = "modid")]
    pub mod_id: String,
    pub version: String,
}