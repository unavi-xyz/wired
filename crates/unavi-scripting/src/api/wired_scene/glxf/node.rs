use std::cell::Cell;

use bevy::{prelude::*, utils::HashSet};
use wasm_bridge::component::Resource;

use crate::{
    api::{
        utils::{RefCount, RefCountCell, RefResource},
        wired_scene::wired::scene::glxf::{
            Asset, AssetBorrow, Children, ChildrenBorrow, HostGlxfNode, Transform,
        },
    },
    state::StoreState,
};

use super::{asset_gltf::GltfAssetRes, asset_glxf::GlxfAssetRes};

#[derive(Component, Clone, Copy, Debug)]
pub struct GlxfNodeId(pub u32);

#[derive(Bundle)]
pub struct WiredNodeBundle {
    pub id: GlxfNodeId,
    pub spatial: SpatialBundle,
}

impl WiredNodeBundle {
    pub fn new(id: u32) -> Self {
        Self {
            id: GlxfNodeId(id),
            spatial: SpatialBundle::default(),
        }
    }
}

#[derive(Default, Debug)]
pub struct GlxfNodeRes {
    children: Option<NodeChildren>,
    name: String,
    parent: Option<u32>,
    transform: Transform,
    ref_count: RefCountCell,
}

#[derive(Debug)]
enum NodeChildren {
    AssetGltf(u32),
    AssetGlxf(u32),
    Nodes(HashSet<u32>),
}

impl RefCount for GlxfNodeRes {
    fn ref_count(&self) -> &Cell<usize> {
        &self.ref_count
    }
}

impl RefResource for GlxfNodeRes {}

impl HostGlxfNode for StoreState {
    fn new(&mut self) -> wasm_bridge::Result<Resource<GlxfNodeRes>> {
        let node = GlxfNodeRes::default();
        let table_res = self.table.push(node)?;
        let res = GlxfNodeRes::from_res(&table_res, &self.table)?;
        let rep = res.rep();

        let glxf_nodes = self.entities.glxf_nodes.clone();
        self.commands.push(move |world: &mut World| {
            let entity = world.spawn(WiredNodeBundle::new(rep)).id();
            let mut nodes = glxf_nodes.write().unwrap();
            nodes.insert(rep, entity);
        });

        Ok(res)
    }

    fn id(&mut self, self_: Resource<GlxfNodeRes>) -> wasm_bridge::Result<u32> {
        Ok(self_.rep())
    }

    fn name(&mut self, self_: Resource<GlxfNodeRes>) -> wasm_bridge::Result<String> {
        let node = self.table.get(&self_)?;
        Ok(node.name.clone())
    }
    fn set_name(&mut self, self_: Resource<GlxfNodeRes>, value: String) -> wasm_bridge::Result<()> {
        let node = self.table.get_mut(&self_)?;
        node.name = value;
        Ok(())
    }

    fn transform(&mut self, self_: Resource<GlxfNodeRes>) -> wasm_bridge::Result<Transform> {
        let node = self.table.get(&self_)?;
        Ok(node.transform)
    }
    fn set_transform(
        &mut self,
        self_: Resource<GlxfNodeRes>,
        value: Transform,
    ) -> wasm_bridge::Result<()> {
        let node = self.table.get_mut(&self_)?;
        node.transform = value;

        let transform = bevy::prelude::Transform {
            translation: bevy::prelude::Vec3::new(
                node.transform.translation.x,
                node.transform.translation.y,
                node.transform.translation.z,
            ),
            rotation: bevy::prelude::Quat::from_xyzw(
                node.transform.rotation.x,
                node.transform.rotation.y,
                node.transform.rotation.z,
                node.transform.rotation.w,
            ),
            scale: bevy::prelude::Vec3::new(
                node.transform.scale.x,
                node.transform.scale.y,
                node.transform.scale.z,
            ),
        };

        self.node_insert(self_.rep(), transform);

        Ok(())
    }

    fn parent(
        &mut self,
        self_: Resource<GlxfNodeRes>,
    ) -> wasm_bridge::Result<Option<Resource<GlxfNodeRes>>> {
        let data = self.table.get(&self_)?;
        let parent = match data.parent {
            Some(p) => Some(GlxfNodeRes::from_rep(p, &self.table)?),
            None => None,
        };
        Ok(parent)
    }
    fn children(&mut self, self_: Resource<GlxfNodeRes>) -> wasm_bridge::Result<Option<Children>> {
        let data = self.table.get(&self_)?;
        match &data.children {
            None => Ok(None),
            Some(NodeChildren::AssetGltf(rep)) => Ok(Some(Children::Asset(Asset::Gltf(
                GltfAssetRes::from_rep(*rep, &self.table)?,
            )))),
            Some(NodeChildren::AssetGlxf(rep)) => Ok(Some(Children::Asset(Asset::Glxf(
                GlxfAssetRes::from_rep(*rep, &self.table)?,
            )))),
            Some(NodeChildren::Nodes(reps)) => Ok(Some(Children::Nodes(
                reps.iter()
                    .map(|rep| GlxfNodeRes::from_rep(*rep, &self.table))
                    .collect::<Result<Vec<_>, _>>()?,
            ))),
        }
    }
    fn set_children(
        &mut self,
        self_: Resource<GlxfNodeRes>,
        value: Option<ChildrenBorrow>,
    ) -> wasm_bridge::Result<()> {
        let data = self.table.get_mut(&self_)?;

        match value {
            None => {
                data.children = None;
            }
            Some(ChildrenBorrow::Asset(AssetBorrow::Gltf(res))) => {
                data.children = Some(NodeChildren::AssetGltf(res.rep()))
            }
            Some(ChildrenBorrow::Asset(AssetBorrow::Glxf(res))) => {
                data.children = Some(NodeChildren::AssetGlxf(res.rep()))
            }
            Some(ChildrenBorrow::Nodes(nodes)) => {
                data.children = Some(NodeChildren::Nodes(
                    nodes.iter().map(|res| res.rep()).collect(),
                ))
            }
        }

        Ok(())
    }

    fn drop(&mut self, rep: Resource<GlxfNodeRes>) -> wasm_bridge::Result<()> {
        let id = rep.rep();
        let dropped = GlxfNodeRes::handle_drop(rep, &mut self.table)?;

        if dropped {
            let glxf_nodes = self.entities.glxf_nodes.clone();
            self.commands.push(move |world: &mut World| {
                let mut nodes = glxf_nodes.write().unwrap();
                let entity = nodes.remove(&id).unwrap();
                world.despawn(entity);
            });
        }

        Ok(())
    }
}
