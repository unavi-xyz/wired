use bevy::prelude::*;
use wasm_bridge::component::Resource;

use crate::{
    api::{
        utils::{RefCount, RefCountCell, RefResource},
        wired_scene::wired::scene::scene::{Host, HostScene},
    },
    state::StoreState,
};

use super::node::NodeRes;

#[derive(Component, Clone, Copy, Debug)]
pub struct SceneId(pub u32);

#[derive(Bundle)]
pub struct WiredSceneBundle {
    pub id: SceneId,
    pub scene: SceneBundle,
}

impl WiredSceneBundle {
    pub fn new(id: u32) -> Self {
        Self {
            id: SceneId(id),
            scene: SceneBundle::default(),
        }
    }
}

#[derive(Default)]
pub struct SceneRes {
    pub nodes: Vec<u32>,
    name: String,
    ref_count: RefCountCell,
}

impl RefCount for SceneRes {
    fn ref_count(&self) -> &std::cell::Cell<usize> {
        &self.ref_count
    }
}

impl RefResource for SceneRes {}

impl HostScene for StoreState {
    fn new(&mut self) -> wasm_bridge::Result<Resource<SceneRes>> {
        let node = SceneRes::default();
        let table_res = self.table.push(node)?;
        let res = SceneRes::from_res(&table_res, &self.table)?;

        let rep = res.rep();
        let scenes = self.entities.scenes.clone();
        self.commands.push(move |world: &mut World| {
            let entity = world.spawn(WiredSceneBundle::new(rep)).id();
            let mut scenes = scenes.write().unwrap();
            scenes.insert(rep, entity);
        });

        Ok(res)
    }

    fn id(&mut self, self_: Resource<SceneRes>) -> wasm_bridge::Result<u32> {
        Ok(self_.rep())
    }

    fn name(&mut self, self_: Resource<SceneRes>) -> wasm_bridge::Result<String> {
        let data = self.table.get(&self_)?;
        Ok(data.name.clone())
    }
    fn set_name(&mut self, self_: Resource<SceneRes>, value: String) -> wasm_bridge::Result<()> {
        let data = self.table.get_mut(&self_)?;
        data.name = value;
        Ok(())
    }

    fn nodes(&mut self, self_: Resource<SceneRes>) -> wasm_bridge::Result<Vec<Resource<NodeRes>>> {
        let data = self.table.get(&self_)?;
        let nodes = data
            .nodes
            .iter()
            .map(|rep| NodeRes::from_rep(*rep, &self.table))
            .collect::<Result<_, _>>()?;
        Ok(nodes)
    }
    fn add_node(
        &mut self,
        self_: Resource<SceneRes>,
        value: Resource<NodeRes>,
    ) -> wasm_bridge::Result<()> {
        let scene_rep = self_.rep();
        let node_rep = value.rep();

        let data = self.table.get_mut(&self_)?;
        data.nodes.push(node_rep);

        let nodes = self.entities.nodes.clone();
        let scenes = self.entities.scenes.clone();
        self.commands.push(move |world: &mut World| {
            let scenes = scenes.read().unwrap();
            let scene_ent = scenes.get(&scene_rep).unwrap();

            let nodes = nodes.read().unwrap();
            let node_ent = nodes.get(&node_rep).unwrap();

            world
                .commands()
                .entity(*scene_ent)
                .push_children(&[*node_ent]);
        });

        Ok(())
    }
    fn remove_node(
        &mut self,
        self_: Resource<SceneRes>,
        value: Resource<NodeRes>,
    ) -> wasm_bridge::Result<()> {
        let scene_rep = self_.rep();
        let node_rep = value.rep();

        let data = self.table.get_mut(&self_)?;
        data.nodes = data
            .nodes
            .iter()
            .copied()
            .filter(|rep| *rep != value.rep())
            .collect();

        let nodes = self.entities.nodes.clone();
        let scenes = self.entities.scenes.clone();
        self.commands.push(move |world: &mut World| {
            let scenes = scenes.read().unwrap();
            let scene_ent = scenes.get(&scene_rep).unwrap();

            let nodes = nodes.read().unwrap();
            let node_ent = nodes.get(&node_rep).unwrap();

            world
                .commands()
                .entity(*scene_ent)
                .remove_children(&[*node_ent]);
        });

        Ok(())
    }

    fn drop(&mut self, rep: Resource<SceneRes>) -> wasm_bridge::Result<()> {
        let id = rep.rep();
        let dropped = SceneRes::handle_drop(rep, &mut self.table)?;

        if dropped {
            let scenes = self.entities.scenes.clone();
            self.commands.push(move |world: &mut World| {
                let mut scenes = scenes.write().unwrap();
                let entity = scenes.remove(&id).unwrap();
                world.despawn(entity);
            });
        }

        Ok(())
    }
}

impl Host for StoreState {}
