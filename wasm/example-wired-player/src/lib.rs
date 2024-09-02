use bindings::{
    exports::wired::script::types::{Guest, GuestScript},
    unavi::{
        scene::api::{Node, Transform},
        shapes::api::{Sphere, Vec3},
    },
    wired::player::api::local_player,
};

#[allow(warnings)]
mod bindings;
mod wired_math_impls;

struct Script;

impl GuestScript for Script {
    fn new() -> Self {
        let offset = Transform::from_translation(Vec3::new(0.0, 0.0, 0.0));
        let player = local_player();

        create_marker(&player.root(), &Sphere::new_ico(0.06), offset);

        let marker = Sphere::new_ico(0.04);
        let skeleton = player.skeleton();

        create_marker(&skeleton.hips, &marker, offset);
        create_marker(&skeleton.spine, &marker, offset);
        create_marker(&skeleton.chest, &marker, offset);
        create_marker(&skeleton.upper_chest, &marker, offset);
        create_marker(&skeleton.neck, &marker, offset);
        create_marker(&skeleton.head, &marker, offset);
        create_marker(&skeleton.left_shoulder, &marker, offset);
        create_marker(&skeleton.left_upper_arm, &marker, offset);
        create_marker(&skeleton.left_lower_arm, &marker, offset);
        create_marker(&skeleton.left_hand, &marker, offset);
        create_marker(&skeleton.left_upper_leg, &marker, offset);
        create_marker(&skeleton.left_lower_leg, &marker, offset);
        create_marker(&skeleton.left_foot, &marker, offset);
        create_marker(&skeleton.right_shoulder, &marker, offset);
        create_marker(&skeleton.right_upper_arm, &marker, offset);
        create_marker(&skeleton.right_lower_arm, &marker, offset);
        create_marker(&skeleton.right_hand, &marker, offset);
        create_marker(&skeleton.right_upper_leg, &marker, offset);
        create_marker(&skeleton.right_lower_leg, &marker, offset);
        create_marker(&skeleton.right_foot, &marker, offset);

        Script
    }

    fn update(&self, _delta: f32) {}
}

fn create_marker(bone: &Node, marker: &Sphere, offset: Transform) -> Node {
    let node = marker.to_node();
    node.set_transform(offset);
    bone.add_child(&node);
    node
}

struct Types;

impl Guest for Types {
    type Script = Script;
}

bindings::export!(Types with_types_in bindings);