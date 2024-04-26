use bevy::prelude::*;
use wasm_component_layer::{AsContextMut, ResourceOwn, Value};

use super::{
    host::wired_ecs::WiredEcsMap, load::WasmStore, script::ScriptInterface, util::blocking_lock,
};

#[derive(Component)]
pub struct ScriptData(ResourceOwn);

pub fn init_scripts(
    mut commands: Commands,
    mut scripts: Query<(Entity, &ScriptInterface, &mut WasmStore), Without<ScriptData>>,
) {
    for (entity, script, mut store) in scripts.iter_mut() {
        let ecs_world = script.ecs_world.borrow(store.0.as_context_mut()).unwrap();

        let mut results = vec![Value::U8(0)];

        if let Err(e) = script.init.call(
            store.0.as_context_mut(),
            &[Value::Borrow(ecs_world.clone())],
            &mut results,
        ) {
            error!("Failed to init script: {}", e);
            continue;
        }

        let script_data = match results.remove(0) {
            Value::Own(own) => own,
            _ => {
                error!("Wrong script data value");
                continue;
            }
        };

        commands.entity(entity).insert(ScriptData(script_data));
    }
}

const UPDATE_HZ: f32 = 20.0;
const UPDATE_DELTA: f32 = 1.0 / UPDATE_HZ;

pub fn update_scripts(
    mut last_update: Local<f32>,
    mut scripts: Query<(&ScriptInterface, &mut WasmStore, &ScriptData, &WiredEcsMap)>,
    time: Res<Time>,
) {
    let now = time.elapsed_seconds();
    let delta = now - *last_update;

    if delta < UPDATE_DELTA {
        return;
    }

    *last_update = now;

    for (script, mut store, data, ecs) in scripts.iter_mut() {
        // Process query results.
        {
            let mut query_results = blocking_lock(&store.0.data().query_results);

            while let Ok(query) = ecs.query_receiver_results.try_recv() {
                query_results.insert(query.id, query.result.clone());

                if let Err(e) = ecs.query_sender.send(query) {
                    error!("Failed to send query: {}", e);
                }
            }
        }

        // Call update.
        let script_data_borrow = match data.0.borrow(store.0.as_context_mut()) {
            Ok(s) => Value::Borrow(s),
            Err(e) => {
                error!("Failed to borrow script data: {}", e);
                continue;
            }
        };

        let ecs_world_borrow = match script.ecs_world.borrow(store.0.as_context_mut()) {
            Ok(r) => Value::Borrow(r),
            Err(e) => {
                error!("Failed to borrow ecs world: {}", e);
                continue;
            }
        };

        if let Err(e) = script.update.call(
            store.0.as_context_mut(),
            &[ecs_world_borrow, script_data_borrow],
            &mut [],
        ) {
            error!("Failed to call script update: {}", e);
        }
    }
}
