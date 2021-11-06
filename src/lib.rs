use serde::Serialize;
use std::collections::HashMap;

use wasm_bindgen::prelude::wasm_bindgen;

use sts_map_oracle::generate_maps;
use sts_map_oracle::Map;
use sts_map_oracle::MapRoomNode;
use sts_map_oracle::RoomType;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

const MAP_HEIGHT: i32 = 15;
const MAP_WIDTH: i32 = 7;
const PATH_DENSITY: i32 = 6;

#[derive(Debug, Serialize)]
struct Room {
    typ: &'static str,
    connections: Vec<u8>,
}

fn is_relevant(node: &&MapRoomNode) -> bool {
    node.class.is_some() && (!node.edges.is_empty() || !node.parents.is_empty())
}

#[wasm_bindgen]
pub fn generate_map(seed: i64, act_idx: usize) -> String {
    let maps: Vec<Map> = generate_maps(seed, MAP_HEIGHT, MAP_WIDTH, PATH_DENSITY);

    let act = &maps[act_idx];
    let floors: HashMap<i32, Vec<Room>> = act
        .iter()
        .map(|row| {
            (
                row[0].y + 1,
                row.iter()
                    .filter(is_relevant)
                    .map(|node| Room {
                        typ: match node.class.unwrap() {
                            RoomType::EventRoom => "event",
                            RoomType::MonsterRoom => "enemy",
                            RoomType::MonsterRoomElite => "elite",
                            RoomType::RestRoom => "rest",
                            RoomType::ShopRoom => "shop",
                            RoomType::TreasureRoom => "treasure",
                        },
                        connections: if node.y + 1 < MAP_HEIGHT {
                            node.edges
                                .iter()
                                .filter(|edge| edge.dst_y > node.y as i32)
                                .map(|edge| {
                                    act[(node.y + 1) as usize]
                                        .iter()
                                        .filter(is_relevant)
                                        .position(|upnode| upnode.x == edge.dst_x)
                                        .unwrap() as u8
                                })
                                .collect()
                        } else {
                            vec![]
                        },
                    })
                    .collect(),
            )
        })
        .collect();

    return serde_json::to_string(&floors).unwrap();
}

#[cfg(test)]
mod tests {
    use super::generate_map;

    #[test]
    fn test() {
        let seed = 673465884448;
        generate_map(seed, 0);
        assert_eq!(1, 2);
    }
}
