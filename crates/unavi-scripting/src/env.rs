use bevy::{asset::Handle, pbr::StandardMaterial};
use wasm_bridge::{
    component::{Linker, Resource},
    Config, Engine, Store,
};

use crate::{
    api::wired::{
        dwn::WiredDwn,
        log::WiredLog,
        player::{player::Player, WiredPlayer},
        scene::{Entities, WiredScene},
        script::bindings::Script,
    },
    data::ScriptData,
};

#[derive(Default)]
pub struct ScriptEnvBuilder {
    pub data: ScriptData,
    components: Vec<Box<dyn Send + Fn(&mut Linker<ScriptData>) -> anyhow::Result<()>>>,
}

impl ScriptEnvBuilder {
    pub fn enable_wired_dwn(&mut self, data: WiredDwn) {
        self.data.api.wired_dwn.replace(data);
        self.components
            .push(Box::new(crate::api::wired::dwn::add_to_linker));
    }
    pub fn enable_wired_input(&mut self) {
        self.components
            .push(Box::new(crate::api::wired::input::add_to_linker));
    }
    pub fn enable_wired_log(&mut self, name: String) {
        self.data.api.wired_log.replace(WiredLog { name });
        self.components
            .push(Box::new(crate::api::wired::log::add_to_linker));
    }
    pub fn enable_wired_physics(&mut self) {
        self.components
            .push(Box::new(crate::api::wired::physics::add_to_linker));
    }
    pub fn enable_wired_player(&mut self) {
        let data = WiredPlayer {
            local_player: Resource::new_own(0),
        };
        self.data.api.wired_player.replace(data);
        self.components
            .push(Box::new(crate::api::wired::player::add_to_linker));
    }
    pub fn enable_wired_scene(&mut self, default_material: Handle<StandardMaterial>) {
        let data = WiredScene {
            default_material,
            entities: Entities::default(),
            root: Resource::new_own(0),
        };

        self.data.api.wired_scene.replace(data);
        self.components
            .push(Box::new(crate::api::wired::scene::add_to_linker));

        self.data.api.wired_scene.as_mut().unwrap().root = {
            use crate::api::wired::scene::bindings::composition::HostComposition;
            self.data.new().unwrap()
        };
    }

    pub async fn instantiate_script(self, bytes: &[u8]) -> anyhow::Result<ScriptEnv> {
        let mut config = Config::new();
        config.async_support(true);
        config.wasm_component_model(true);

        let engine = Engine::new(&config).expect("Failed to create wasm engine");

        let mut store = Store::new(&engine, self.data);
        let mut linker = Linker::new(store.engine());

        if store.data().api.wired_player.is_some() {
            let local_player =
                Player::new(store.data_mut()).expect("Failed to create local player resource");
            store
                .data_mut()
                .api
                .wired_player
                .as_mut()
                .unwrap()
                .local_player = local_player;
        }

        wasm_bridge_wasi::add_to_linker_async(&mut linker)?;

        for add_to_linker in self.components {
            add_to_linker(&mut linker)?;
        }

        let component = wasm_bridge::component::Component::new_safe(store.engine(), bytes).await?;
        let (script, _) = Script::instantiate_async(&mut store, &component, &linker).await?;

        Ok(ScriptEnv { script, store })
    }
}

pub struct ScriptEnv {
    pub script: Script,
    pub store: Store<ScriptData>,
}