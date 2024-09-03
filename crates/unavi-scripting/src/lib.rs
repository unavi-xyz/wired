use bevy::prelude::*;
use execution::ScriptTickrate;
use load::DefaultMaterial;
use unavi_constants::assets::WASM_ASSETS_DIR;

use self::load::ScriptMap;

pub mod api;
mod asset;
mod execution;
mod load;
mod state;

pub use asset::*;

pub struct ScriptingPlugin;

impl Plugin for ScriptingPlugin {
    fn build(&self, app: &mut App) {
        let mut materials = app
            .world_mut()
            .get_resource_mut::<Assets<StandardMaterial>>()
            .unwrap();
        let default_material = materials.add(StandardMaterial::default());

        app.register_asset_loader(asset::WasmLoader)
            .init_asset::<Wasm>()
            .init_non_send_resource::<ScriptMap>()
            .insert_resource(DefaultMaterial(default_material))
            .add_systems(
                FixedUpdate,
                (
                    load::load_scripts,
                    execution::tick_scripts,
                    api::wired::player::systems::update_player_skeletons,
                    execution::init_scripts,
                    execution::update_scripts,
                )
                    .chain(),
            );
    }
}

#[derive(Bundle)]
pub struct ScriptBundle {
    pub name: Name,
    pub tickrate: ScriptTickrate,
    pub wasm: Handle<Wasm>,
}

impl ScriptBundle {
    /// Loads a give WASM script from the assets folder, in the `namespace:package` format.
    pub fn load(name: &str, asset_server: &AssetServer) -> Self {
        let (namespace, package) = name.split_once(':').unwrap();

        let path = format!("{}/{}/{}.wasm", WASM_ASSETS_DIR, namespace, package);
        let wasm = asset_server.load(path);

        Self {
            name: name.into(),
            tickrate: ScriptTickrate::default(),
            wasm,
        }
    }
}
