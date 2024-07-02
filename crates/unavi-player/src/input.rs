use bevy::input::keyboard::KeyCode;
use bevy::prelude::*;
use bevy_xpbd_3d::prelude::*;
use unavi_constants::layers::{OTHER_PLAYER_LAYER, WORLD_LAYER};
use unavi_scripting::{
    actions::handler::InputHandler, api::wired_input::input_handler::ScriptInputEvent,
};

use crate::PlayerCamera;

use super::Player;

#[derive(Resource)]
pub struct InputMap {
    pub key_forward: KeyCode,
    pub key_backward: KeyCode,
    pub key_left: KeyCode,
    pub key_right: KeyCode,
    pub key_jump: KeyCode,
    pub key_sprint: KeyCode,
    pub key_crouch: KeyCode,
}

impl Default for InputMap {
    fn default() -> Self {
        Self {
            key_forward: KeyCode::KeyW,
            key_backward: KeyCode::KeyS,
            key_left: KeyCode::KeyA,
            key_right: KeyCode::KeyD,
            key_jump: KeyCode::Space,
            key_sprint: KeyCode::ShiftLeft,
            key_crouch: KeyCode::ControlLeft,
        }
    }
}

pub fn read_keyboard_input(
    keys: Res<ButtonInput<KeyCode>>,
    input_map: Res<InputMap>,
    mut players: Query<&mut Player>,
) {
    for mut player in players.iter_mut() {
        player.input.forward = keys.pressed(input_map.key_forward);
        player.input.backward = keys.pressed(input_map.key_backward);
        player.input.left = keys.pressed(input_map.key_left);
        player.input.right = keys.pressed(input_map.key_right);
        player.input.jump = keys.pressed(input_map.key_jump);
        player.input.sprint = keys.pressed(input_map.key_sprint);
    }
}

const RAYCAST_DISTANCE: f32 = 10.0;

pub fn handle_raycast_input(
    camera: Query<&GlobalTransform, With<PlayerCamera>>,
    mouse: Res<ButtonInput<MouseButton>>,
    nodes: Query<(Entity, &InputHandler)>,
    query: SpatialQuery,
) {
    if camera.is_empty() {
        return;
    }

    if mouse.just_pressed(MouseButton::Left) {
        let transform = camera.single();
        let (_, rotation, translation) = transform.to_scale_rotation_translation();

        let direction = rotation.normalize() * Direction3d::NEG_Z;

        if let Some(hit) = query.cast_ray(
            translation,
            direction,
            RAYCAST_DISTANCE,
            false,
            SpatialQueryFilter {
                mask: OTHER_PLAYER_LAYER | WORLD_LAYER,
                ..default()
            },
        ) {
            for (ent, handler) in nodes.iter() {
                // TODO: Recursive check if children were hit.

                if hit.entity == ent {
                    if let Err(e) = handler.send(ScriptInputEvent::Raycast {
                        origin: translation,
                        orientation: rotation,
                    }) {
                        error!("Failed to send script input event: {}", e);
                    };
                    break;
                }
            }
        };
    }
}
