use std::cell::RefCell;

use bindings::{
    exports::wired::script::lifecycle::{Data, DataBorrow, Guest, GuestData},
    wired::{
        ecs::types::{EcsWorld, Query},
        log::api::{log, LogLevel},
    },
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

struct DataImpl {
    store: RefCell<Store<Count>>,
    query: Query,
}

impl GuestData for DataImpl {}

struct UnaviSystem;

impl Guest for UnaviSystem {
    type Data = DataImpl;

    fn init(ecs_world: &EcsWorld) -> Data {
        let component = ecs_world.register_component();
        let query = ecs_world.register_query(&[&component]);

        let mut store = Store::new(component);

        ecs_world.spawn(vec![store.insert_new(Count {
            value: 0,
            increment: 2,
        })]);

        log(LogLevel::Info, "initialized");

        Data::new(DataImpl {
            store: store.into(),
            query,
        })
    }

    fn update(_ecs_world: &EcsWorld, data: DataBorrow) {
        let data: &DataImpl = data.get();

        let mut store = data.store.borrow_mut();

        for (_entity, components) in data.query.read() {
            let count_component = components.first().unwrap();

            let count = store.get(count_component).unwrap();
            log(LogLevel::Info, &format!("Count: {}", count.value));

            let mut count = count.clone();
            count.value += count.increment;

            store.insert(count_component, count)
        }
    }
}

bindings::export!(UnaviSystem with_types_in bindings);