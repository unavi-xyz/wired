use std::cell::RefCell;

use bindings::{
    exports::wired::script::types::{Guest, GuestScript, Script, ScriptBorrow},
    wired::ecs::types::{EcsWorld, Query},
};
use store::Store;

#[allow(warnings)]
mod bindings;

mod store;

#[derive(Clone)]
struct Count {
    increment: usize,
    value: usize,
}

struct ScriptImpl {
    store: RefCell<Store<Count>>,
    query: Query,
}

impl GuestScript for ScriptImpl {}

struct UnaviSystem;

impl Guest for UnaviSystem {
    type Script = ScriptImpl;

    fn init(ecs_world: &EcsWorld) -> Script {
        let component = ecs_world.register_component();
        let query = ecs_world.register_query(&[&component]);

        let mut store = Store::new(component);

        ecs_world.spawn(vec![store.insert_new(Count {
            value: 0,
            increment: 2,
        })]);

        Script::new(ScriptImpl {
            store: store.into(),
            query,
        })
    }

    fn update(_ecs_world: &EcsWorld, script: ScriptBorrow) {
        let script: &ScriptImpl = script.get();

        let mut store = script.store.borrow_mut();

        for (_entity, components) in script.query.read() {
            let count_component = components.first().unwrap();

            let count = store.get(count_component).unwrap();
            println!("Count: {}", count.value);

            let mut count = count.clone();
            count.value += count.increment;

            store.insert(count_component, count)
        }
    }
}

bindings::export!(UnaviSystem with_types_in bindings);
