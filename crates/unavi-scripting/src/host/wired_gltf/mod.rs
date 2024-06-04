use std::sync::{Arc, RwLock};

use anyhow::Result;
use bevy::{
    prelude::*,
    utils::{HashMap, HashSet},
};
use crossbeam::channel::Receiver;
use wasm_component_layer::{Linker, Store};

use crate::{load::EngineBackend, StoreData};

pub mod handler;
mod mesh;
mod node;
pub mod query;

#[derive(Component, Deref, DerefMut)]
pub struct WiredGltfReceiver(pub Receiver<WiredGltfAction>);

pub enum WiredGltfAction {
    CreateMesh { id: u32 },
    CreateNode { id: u32 },
    RemoveMesh { id: u32 },
    RemoveNode { id: u32 },
    SetNodeParent { id: u32, parent: Option<u32> },
    SetNodeTransform { id: u32, transform: Transform },
}

#[derive(Component, Deref, DerefMut)]
pub struct WiredGltfData(pub Arc<RwLock<EcsData>>);

#[derive(Default)]
pub struct EcsData {
    nodes: HashMap<u32, Transform>,
}

#[derive(Default)]
struct LocalData {
    next_id: u32,
    nodes: HashMap<u32, NodeData>,
    meshes: HashMap<u32, MeshData>,
}

impl LocalData {
    fn new_id(&mut self) -> u32 {
        let id = self.next_id;
        self.next_id += 1;
        id
    }
}

#[derive(Default)]
struct NodeData {
    children: HashSet<u32>,
    parent: Option<u32>,
    resources: HashSet<u32>,
    transform: Transform,
}

#[derive(Default)]
struct MeshData {
    resources: HashSet<u32>,
}

pub fn add_to_host(
    store: &mut Store<StoreData, EngineBackend>,
    linker: &mut Linker,
) -> Result<(WiredGltfReceiver, WiredGltfData)> {
    let data = Arc::new(RwLock::new(EcsData::default()));
    let (send, recv) = crossbeam::channel::bounded::<WiredGltfAction>(100);

    let local_data = Arc::new(RwLock::new(LocalData::default()));

    mesh::add_to_host(store, linker, send.clone(), local_data.clone())?;
    node::add_to_host(store, linker, send, local_data, data.clone())?;

    Ok((WiredGltfReceiver(recv), WiredGltfData(data)))
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use tracing_test::traced_test;

    use crate::{
        asset::{Wasm, WasmLoader},
        load::{LoadedScript, WasmStores},
        unavi_system::load_component_wasm,
        ScriptBundle,
    };

    use super::*;

    #[tokio::test]
    #[traced_test]
    async fn test_wired_gltf() {
        let mut app = App::new();

        app.add_plugins((
            MinimalPlugins,
            AssetPlugin {
                file_path: "../unavi-app/assets".to_string(),
                ..Default::default()
            },
        ));

        app.init_asset::<Wasm>();
        app.init_asset_loader::<WasmLoader>();
        app.init_non_send_resource::<WasmStores>();

        app.add_systems(
            Update,
            (
                crate::load::load_scripts,
                crate::host::wired_gltf::query::query_node_data,
                crate::execution::init_scripts,
                crate::execution::update_scripts,
                handler::handle_wired_gltf_actions,
            )
                .chain(),
        );

        let asset_server = app.world.get_resource_mut::<AssetServer>().unwrap();
        let name = "test_wired_gltf";
        let wasm = load_component_wasm(&asset_server, name);

        app.world.spawn(ScriptBundle {
            name: name.into(),
            wasm,
        });

        tokio::time::sleep(Duration::from_secs_f32(0.2)).await;
        app.update();

        let mut loaded_scripts = app.world.query::<(Entity, &LoadedScript)>();
        let len = loaded_scripts.iter(&app.world).len();
        assert_eq!(len, 1);

        assert!(logs_contain("Hello from script!"));
        assert!(!logs_contain("error"));
        assert!(!logs_contain("ERROR"));
    }
}
