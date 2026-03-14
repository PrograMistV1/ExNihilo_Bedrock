execute @e[type=sf:copper_sand] ~~~ detect ~~~ torch 1 tag @s add torch_1
execute @e[type=sf:copper_sand] ~~~ detect ~~~ torch 2 tag @s add torch_2
execute @e[type=sf:copper_sand] ~~~ detect ~~~ torch 3 tag @s add torch_3
execute @e[type=sf:copper_sand] ~~~ detect ~~~ torch 4 tag @s add torch_4
execute @e[type=sf:copper_sand] ~~~ detect ~~~ torch 5 tag @s add torch_5
execute @e[type=sf:copper_sand] ~~~ detect ~~~ redstone_torch 1 tag @s add redstone_torch_1
execute @e[type=sf:copper_sand] ~~~ detect ~~~ redstone_torch 2 tag @s add redstone_torch_2
execute @e[type=sf:copper_sand] ~~~ detect ~~~ redstone_torch 3 tag @s add redstone_torch_3
execute @e[type=sf:copper_sand] ~~~ detect ~~~ redstone_torch 4 tag @s add redstone_torch_4
execute @e[type=sf:copper_sand] ~~~ detect ~~~ redstone_torch 5 tag @s add redstone_torch_5
execute @e[type=sf:copper_sand] ~~~ detect ~~~ unlit_redstone_torch 1 tag @s add unlit_redstone_torch_1
execute @e[type=sf:copper_sand] ~~~ detect ~~~ unlit_redstone_torch 2 tag @s add unlit_redstone_torch_2
execute @e[type=sf:copper_sand] ~~~ detect ~~~ unlit_redstone_torch 3 tag @s add unlit_redstone_torch_3
execute @e[type=sf:copper_sand] ~~~ detect ~~~ unlit_redstone_torch 4 tag @s add unlit_redstone_torch_4
execute @e[type=sf:copper_sand] ~~~ detect ~~~ unlit_redstone_torch 5 tag @s add unlit_redstone_torch_5
execute @e[type=sf:copper_sand] ~~~ detect ~~~ double_plant 0 tag @s add double_plant_0
execute @e[type=sf:copper_sand] ~~~ detect ~~~ double_plant 1 tag @s add double_plant_1
execute @e[type=sf:copper_sand] ~~~ detect ~~~ double_plant 2 tag @s add double_plant_2
execute @e[type=sf:copper_sand] ~~~ detect ~~~ double_plant 3 tag @s add double_plant_3
execute @e[type=sf:copper_sand] ~~~ detect ~~~ double_plant 4 tag @s add double_plant_4
execute @e[type=sf:copper_sand] ~~~ detect ~~~ double_plant 5 tag @s add double_plant_5
execute @e[type=sf:copper_sand] ~~~ detect ~~~ yellow_flower 0 tag @s add yellow_flower
execute @e[type=sf:copper_sand] ~~~ detect ~~~ red_flower 0 tag @s add red_flower_0
execute @e[type=sf:copper_sand] ~~~ detect ~~~ red_flower 1 tag @s add red_flower_1
execute @e[type=sf:copper_sand] ~~~ detect ~~~ red_flower 2 tag @s add red_flower_2
execute @e[type=sf:copper_sand] ~~~ detect ~~~ red_flower 3 tag @s add red_flower_3
execute @e[type=sf:copper_sand] ~~~ detect ~~~ red_flower 4 tag @s add red_flower_4
execute @e[type=sf:copper_sand] ~~~ detect ~~~ red_flower 5 tag @s add red_flower_5
execute @e[type=sf:copper_sand] ~~~ detect ~~~ red_flower 6 tag @s add red_flower_6
execute @e[type=sf:copper_sand] ~~~ detect ~~~ red_flower 7 tag @s add red_flower_7
execute @e[type=sf:copper_sand] ~~~ detect ~~~ red_flower 8 tag @s add red_flower_8
execute @e[type=sf:copper_sand] ~~~ detect ~~~ small_amethyst_bud 0 tag @s add small_amethyst_bud
execute @e[type=sf:copper_sand] ~~~ detect ~~~ medium_amethyst_bud 0 tag @s add medium_amethyst_bud
execute @e[type=sf:copper_sand] ~~~ detect ~~~ large_amethyst_bud 0 tag @s add large_amethyst_bud
execute @e[type=sf:copper_sand] ~~~ detect ~~~ amethyst_cluster 0 tag @s add amethyst_cluster
execute @e[type=sf:copper_sand] ~~~ detect ~~~ sapling 0 tag @s add sapling_0
execute @e[type=sf:copper_sand] ~~~ detect ~~~ sapling 1 tag @s add sapling_1
execute @e[type=sf:copper_sand] ~~~ detect ~~~ sapling 2 tag @s add sapling_2
execute @e[type=sf:copper_sand] ~~~ detect ~~~ sapling 3 tag @s add sapling_3
execute @e[type=sf:copper_sand] ~~~ detect ~~~ sapling 4 tag @s add sapling_4
execute @e[type=sf:copper_sand] ~~~ detect ~~~ sapling 5 tag @s add sapling_5
execute @e[type=sf:copper_sand] ~~~ detect ~~~ sapling 6 tag @s add sapling_6
execute @e[type=sf:copper_sand] ~~~ detect ~~~ sea_pickle 4 tag @s add sea_pickle_4
execute @e[type=sf:copper_sand] ~~~ detect ~~~ sea_pickle 5 tag @s add sea_pickle_5
execute @e[type=sf:copper_sand] ~~~ detect ~~~ sea_pickle 6 tag @s add sea_pickle_6
execute @e[type=sf:copper_sand] ~~~ detect ~~~ sea_pickle 7 tag @s add sea_pickle_7

setblock ~~~ sf:copper_sand

execute @e[type=sf:copper_sand,tag=torch_1] ~~~ setblock ~~~ torch 1 destroy
execute @e[type=sf:copper_sand,tag=torch_2] ~~~ setblock ~~~ torch 2 destroy
execute @e[type=sf:copper_sand,tag=torch_3] ~~~ setblock ~~~ torch 3 destroy
execute @e[type=sf:copper_sand,tag=torch_4] ~~~ setblock ~~~ torch 4 destroy
execute @e[type=sf:copper_sand,tag=torch_5] ~~~ setblock ~~~ torch 5 destroy
execute @e[type=sf:copper_sand,tag=redstone_torch_1] ~~~ setblock ~~~ redstone_torch 1 destroy
execute @e[type=sf:copper_sand,tag=redstone_torch_2] ~~~ setblock ~~~ redstone_torch 2 destroy
execute @e[type=sf:copper_sand,tag=redstone_torch_3] ~~~ setblock ~~~ redstone_torch 3 destroy
execute @e[type=sf:copper_sand,tag=redstone_torch_4] ~~~ setblock ~~~ redstone_torch 4 destroy
execute @e[type=sf:copper_sand,tag=redstone_torch_5] ~~~ setblock ~~~ redstone_torch 5 destroy
execute @e[type=sf:copper_sand,tag=unlit_redstone_torch_1] ~~~ setblock ~~~ unlit_redstone_torch 1 destroy
execute @e[type=sf:copper_sand,tag=unlit_redstone_torch_2] ~~~ setblock ~~~ unlit_redstone_torch 2 destroy
execute @e[type=sf:copper_sand,tag=unlit_redstone_torch_3] ~~~ setblock ~~~ unlit_redstone_torch 3 destroy
execute @e[type=sf:copper_sand,tag=unlit_redstone_torch_4] ~~~ setblock ~~~ unlit_redstone_torch 4 destroy
execute @e[type=sf:copper_sand,tag=unlit_redstone_torch_5] ~~~ setblock ~~~ unlit_redstone_torch 5 destroy
execute @e[type=sf:copper_sand,tag=double_plant_0] ~~~ setblock ~~~ double_plant 0 destroy
execute @e[type=sf:copper_sand,tag=double_plant_1] ~~~ setblock ~~~ double_plant 1 destroy
execute @e[type=sf:copper_sand,tag=double_plant_2] ~~~ setblock ~~~ double_plant 2 destroy
execute @e[type=sf:copper_sand,tag=double_plant_3] ~~~ setblock ~~~ double_plant 3 destroy
execute @e[type=sf:copper_sand,tag=double_plant_4] ~~~ setblock ~~~ double_plant 4 destroy
execute @e[type=sf:copper_sand,tag=double_plant_5] ~~~ setblock ~~~ double_plant 5 destroy
execute @e[type=sf:copper_sand,tag=yellow_flower] ~~~ setblock ~~~ yellow_flower 0 destroy
execute @e[type=sf:copper_sand,tag=red_flower_0] ~~~ setblock ~~~ red_flower 0 destroy
execute @e[type=sf:copper_sand,tag=red_flower_1] ~~~ setblock ~~~ red_flower 1 destroy
execute @e[type=sf:copper_sand,tag=red_flower_2] ~~~ setblock ~~~ red_flower 2 destroy
execute @e[type=sf:copper_sand,tag=red_flower_3] ~~~ setblock ~~~ red_flower 3 destroy
execute @e[type=sf:copper_sand,tag=red_flower_4] ~~~ setblock ~~~ red_flower 4 destroy
execute @e[type=sf:copper_sand,tag=red_flower_5] ~~~ setblock ~~~ red_flower 5 destroy
execute @e[type=sf:copper_sand,tag=red_flower_6] ~~~ setblock ~~~ red_flower 6 destroy
execute @e[type=sf:copper_sand,tag=red_flower_7] ~~~ setblock ~~~ red_flower 7 destroy
execute @e[type=sf:copper_sand,tag=red_flower_8] ~~~ setblock ~~~ red_flower 8 destroy
execute @e[type=sf:copper_sand,tag=small_amethyst_bud] ~~~ setblock ~~~ small_amethyst_bud 0 destroy
execute @e[type=sf:copper_sand,tag=medium_amethyst_bud] ~~~ setblock ~~~ medium_amethyst_bud 0 destroy
execute @e[type=sf:copper_sand,tag=large_amethyst_bud] ~~~ setblock ~~~ large_amethyst_bud 0 destroy
execute @e[type=sf:copper_sand,tag=amethyst_cluster] ~~~ setblock ~~~ amethyst_cluster 0 destroy
execute @e[type=sf:copper_sand,tag=sapling_0] ~~~ setblock ~~~ sapling 0 destroy
execute @e[type=sf:copper_sand,tag=sapling_1] ~~~ setblock ~~~ sapling 1 destroy
execute @e[type=sf:copper_sand,tag=sapling_2] ~~~ setblock ~~~ sapling 2 destroy
execute @e[type=sf:copper_sand,tag=sapling_3] ~~~ setblock ~~~ sapling 3 destroy
execute @e[type=sf:copper_sand,tag=sapling_4] ~~~ setblock ~~~ sapling 4 destroy
execute @e[type=sf:copper_sand,tag=sapling_5] ~~~ setblock ~~~ sapling 5 destroy
execute @e[type=sf:copper_sand,tag=sapling_6] ~~~ setblock ~~~ sapling 6 destroy
execute @e[type=sf:copper_sand,tag=sea_pickle_4] ~~~ setblock ~~~ sea_pickle 4 destroy
execute @e[type=sf:copper_sand,tag=sea_pickle_5] ~~~ setblock ~~~ sea_pickle 5 destroy
execute @e[type=sf:copper_sand,tag=sea_pickle_6] ~~~ setblock ~~~ sea_pickle 6 destroy
execute @e[type=sf:copper_sand,tag=sea_pickle_7] ~~~ setblock ~~~ sea_pickle 7 destroy
execute @e[type=sf:copper_sand] ~~~ event entity @s despawn_event