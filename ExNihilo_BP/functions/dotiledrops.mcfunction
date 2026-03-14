scoreboard objectives add dotiledrops dummy

scoreboard players set @a[tag=!dotiledropstrue] dotiledrops 2
tag @a add dotiledropstrue
scoreboard players add @a[scores={dotiledrops=!0}] dotiledrops -1

execute @a[scores={dotiledrops=1}] ~~~ gamerule dotiledrops true
