package dev.donating.phone;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.bukkit.GameMode;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.Sound;
import org.bukkit.block.Block;
import org.bukkit.block.BlockFace;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.Action;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.event.inventory.InventoryDragEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.inventory.EquipmentSlot;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.persistence.PersistentDataType;

/**
 * The GPS path wand (2026-10-21; the owner: "an easy in-game way to add/move/remove/link nodes (e.g. a staff wand tool +
 * a click menu), beyond /dphone path"). /dphone path wand puts it in the empty main hand (creative only: the fixed
 * inventory is the survival layout). While it's in hand the paths show (like /dphone path show) and the selected node
 * has an aqua ring:
 *  - right-click a block: a node on top of it (the block's own height: a slab, a stair), linked to the selected node,
 *    and selected; right-click the air: a node at your feet.
 *  - left-click a node (aim at it, up to 48 blocks): select it.
 *  - sneak + left-click a node: link it to the selected one (again: unlink).
 *  - sneak + right-click: the menu for the selected node: move it to your feet, link it to the nearest node, unlink
 *    all, delete (a second click), deselect.
 * Every change is the same as the commands (Paths: saved to paths.yml within a second). Clicks with the wand never
 * break or use a block. Only for donating.phone.admin.
 */
final class PathWand implements Listener {
    private final PhonePlugin plugin;
    private final Paths paths;
    private final NamespacedKey key;
    private final Map<UUID, Long> lastUse = new HashMap<>(); // one action per click (a block click comes with an air click)
    private final Map<UUID, long[]> armed = new HashMap<>(); // a delete armed in the menu: {node, when}

    PathWand(PhonePlugin plugin, Paths paths) {
        this.plugin = plugin;
        this.paths = paths;
        this.key = new NamespacedKey(plugin, "pathwand");
        paths.wand = this;
    }

    ItemStack item() {
        ItemStack it = new ItemStack(Material.BLAZE_ROD);
        ItemMeta m = it.getItemMeta();
        m.setDisplayName("§bGPS Path Wand");
        m.setLore(List.of("§7Right-click a block: add a node, linked", "§7Left-click a node: select it",
                "§7Sneak + left-click a node: link / unlink", "§7Sneak + right-click: the node's menu"));
        m.getPersistentDataContainer().set(key, PersistentDataType.BYTE, (byte) 1);
        m.setEnchantmentGlintOverride(true);
        it.setItemMeta(m);
        return it;
    }

    boolean isWand(ItemStack it) {
        return it != null && it.getType() == Material.BLAZE_ROD && it.hasItemMeta() && it.getItemMeta().getPersistentDataContainer().has(key, PersistentDataType.BYTE);
    }

    boolean holds(Player p) { return isWand(p.getInventory().getItemInMainHand()); }

    String give(Player p) {
        if (p.getGameMode() != GameMode.CREATIVE) return "PATH the wand is for creative (/gamemode creative): the survival hotbar is locked";
        if (holds(p)) return "PATH you hold the wand already";
        if (!p.getInventory().getItemInMainHand().getType().isAir()) return "PATH empty your hand first";
        p.getInventory().setItemInMainHand(item());
        return "PATH the wand: right-click a block adds a node (linked to the selected one), left-click selects, sneak + left-click links or unlinks, sneak + right-click opens the node's menu";
    }

    private boolean allowed(Player p) { return p.hasPermission("donating.phone.admin"); }

    private void say(Player p, String text) { p.sendActionBar(net.kyori.adventure.text.serializer.legacy.LegacyComponentSerializer.legacySection().deserialize(text)); }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onInteract(PlayerInteractEvent e) {
        Player p = e.getPlayer();
        if (e.getHand() != EquipmentSlot.HAND || !holds(p)) return;
        e.setCancelled(true);
        if (!allowed(p)) return;
        long now = System.currentTimeMillis();
        Long last = lastUse.get(p.getUniqueId());
        if (last != null && now - last < 150) return;
        lastUse.put(p.getUniqueId(), now);
        Action a = e.getAction();
        boolean right = a == Action.RIGHT_CLICK_BLOCK || a == Action.RIGHT_CLICK_AIR;
        boolean left = a == Action.LEFT_CLICK_BLOCK || a == Action.LEFT_CLICK_AIR;
        Paths.Node sel = paths.selectedOf(p);
        if (right && p.isSneaking()) {
            if (sel == null) { say(p, "§7Select a node first (left-click it)"); return; }
            openMenu(p, sel);
        } else if (right) {
            Location at = spotFor(p, e.getClickedBlock(), e.getBlockFace());
            Paths.Node d = paths.addNode(at.getWorld().getName(), at.getX(), at.getY(), at.getZ(), sel);
            paths.selected.put(p.getUniqueId(), d.id);
            p.playSound(p.getLocation(), Sound.BLOCK_NOTE_BLOCK_PLING, 0.6f, 1.6f);
            say(p, "§aNode #" + d.id + (sel != null && d.links.contains(sel.id) ? " §7linked to #" + sel.id + " (" + Paths.num(Paths.distance(sel, d)) + " blocks)" : ""));
        } else if (left) {
            Paths.Node d = paths.aimed(p);
            if (d == null) { say(p, "§7No node there (aim at its green dot)"); return; }
            if (p.isSneaking()) {
                if (sel == null) { say(p, "§7Select a node first (left-click it)"); return; }
                if (sel.id == d.id) { say(p, "§7That's the selected node"); return; }
                boolean on = paths.toggleLink(sel, d);
                p.playSound(p.getLocation(), on ? Sound.BLOCK_CHAIN_PLACE : Sound.BLOCK_CHAIN_BREAK, 0.7f, 1f);
                say(p, (on ? "§aLinked #" : "§eUnlinked #") + sel.id + " - #" + d.id);
            } else {
                paths.selected.put(p.getUniqueId(), d.id);
                p.playSound(p.getLocation(), Sound.UI_BUTTON_CLICK, 0.5f, 1.4f);
                say(p, "§bSelected " + Paths.describe(d));
            }
        }
    }

    /** Where a right-click puts a node: on top of the clicked block (its own height), else in the block next to the face
     *  clicked, else (the air) at the feet. */
    private static Location spotFor(Player p, Block b, BlockFace face) {
        if (b == null) {
            Location l = p.getLocation();
            return new Location(l.getWorld(), l.getBlockX() + 0.5, Math.round(l.getY() * 100) / 100.0, l.getBlockZ() + 0.5);
        }
        if (face == BlockFace.UP || face == null) {
            // The top of what you stand on (a slab 0.5, a stair's back 1; a plant or carpet: its block's floor).
            double top = b.getY();
            for (org.bukkit.util.BoundingBox bb : b.getCollisionShape().getBoundingBoxes()) top = Math.max(top, b.getY() + bb.getMaxY());
            return new Location(b.getWorld(), b.getX() + 0.5, Math.round(top * 100) / 100.0, b.getZ() + 0.5);
        }
        Block n = b.getRelative(face);
        return new Location(b.getWorld(), n.getX() + 0.5, n.getY(), n.getZ() + 0.5);
    }

    /** Creative breaks blocks on a left-click: never with the wand. */
    @EventHandler(priority = EventPriority.LOWEST)
    public void onBreak(BlockBreakEvent e) {
        if (holds(e.getPlayer())) e.setCancelled(true);
    }

    // ---------------------------------------------------------------- the node's menu

    private static final class Menu implements InventoryHolder {
        final int node;
        Inventory inv;
        Menu(int node) { this.node = node; }
        @Override public Inventory getInventory() { return inv; }
    }

    private static ItemStack button(Material m, String name, String... lore) {
        ItemStack it = new ItemStack(m);
        ItemMeta meta = it.getItemMeta();
        meta.setDisplayName(name);
        if (lore.length > 0) meta.setLore(List.of(lore));
        it.setItemMeta(meta);
        return it;
    }

    private void openMenu(Player p, Paths.Node d) {
        Menu h = new Menu(d.id);
        Inventory inv = plugin.getServer().createInventory(h, 9, "GPS node #" + d.id);
        h.inv = inv;
        List<String> info = new ArrayList<>();
        info.add("§7" + d.world + " " + Paths.num(d.x) + " " + Paths.num(d.y) + " " + Paths.num(d.z));
        info.add("§7Links: §f" + (d.links.isEmpty() ? "none" : d.links.toString()));
        if (!d.name.isEmpty()) info.add("§7Name: §f" + d.name);
        inv.setItem(0, button(Material.PAPER, "§bNode #" + d.id, info.toArray(new String[0])));
        inv.setItem(2, button(Material.ENDER_PEARL, "§fMove it to your feet"));
        Paths.Node near = paths.nearestUnlinked(d, 32);
        inv.setItem(3, near == null ? button(Material.GRAY_DYE, "§7No node within 32 blocks to link")
                : button(Material.LEAD, "§fLink to the nearest: #" + near.id, "§7" + Paths.num(Paths.distance(d, near)) + " blocks"));
        inv.setItem(4, button(Material.SHEARS, "§fUnlink all", "§7" + d.links.size() + " link(s)"));
        armed.remove(p.getUniqueId()); // a new menu: a delete has to be armed again
        inv.setItem(5, button(Material.BARRIER, "§cDelete", "§7Click twice"));
        inv.setItem(6, button(Material.GRAY_DYE, "§fDeselect"));
        inv.setItem(8, button(Material.OAK_DOOR, "§fClose"));
        p.openInventory(inv);
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onClick(InventoryClickEvent e) {
        if (!(e.getView().getTopInventory().getHolder() instanceof Menu h)) return;
        e.setCancelled(true);
        if (!(e.getWhoClicked() instanceof Player p) || !allowed(p)) return;
        if (e.getRawSlot() < 0 || e.getRawSlot() >= 9) return;
        Paths.Node d = paths.byId(h.node);
        if (d == null) { p.closeInventory(); say(p, "§7That node is gone"); return; }
        switch (e.getRawSlot()) {
            case 2 -> {
                Location l = p.getLocation();
                Paths.Node m = paths.moveNode(d, l.getWorld().getName(), l.getBlockX() + 0.5, Math.round(l.getY() * 100) / 100.0, l.getBlockZ() + 0.5);
                p.closeInventory();
                say(p, "§aMoved " + Paths.describe(m));
            }
            case 3 -> {
                Paths.Node near = paths.nearestUnlinked(d, 32);
                if (near == null) return;
                paths.toggleLink(d, near);
                say(p, "§aLinked #" + d.id + " - #" + near.id);
                openMenu(p, paths.byId(d.id));
            }
            case 4 -> {
                int n = paths.unlinkAll(d);
                say(p, "§eUnlinked " + n + " link(s) from #" + d.id);
                openMenu(p, paths.byId(d.id));
            }
            case 5 -> {
                // A second click within 4 s (the button turns red: "Click again").
                long now = System.currentTimeMillis();
                long[] at = armed.get(p.getUniqueId());
                if (at != null && at[0] == d.id && now - at[1] < 4000) {
                    armed.remove(p.getUniqueId());
                    paths.removeNode(d);
                    p.closeInventory();
                    say(p, "§cDeleted #" + d.id);
                } else {
                    armed.put(p.getUniqueId(), new long[] {d.id, now});
                    e.getView().getTopInventory().setItem(5, button(Material.RED_CONCRETE, "§c§lDelete #" + d.id + "?", "§eClick again to delete"));
                }
            }
            case 6 -> {
                paths.selected.remove(p.getUniqueId());
                p.closeInventory();
                say(p, "§7Nothing selected");
            }
            case 8 -> p.closeInventory();
            default -> { }
        }
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onDrag(InventoryDragEvent e) {
        if (e.getView().getTopInventory().getHolder() instanceof Menu) e.setCancelled(true);
    }
}
