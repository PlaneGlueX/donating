package dev.donating.phone;

import java.util.ArrayList;
import java.util.List;

import org.bukkit.entity.HumanEntity;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.inventory.InventoryOpenEvent;
import org.bukkit.event.player.PlayerResourcePackStatusEvent;
import org.bukkit.inventory.InventoryView;
import org.bukkit.inventory.MenuType;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.TextComponent;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.text.serializer.legacy.LegacyComponentSerializer;

/**
 * Chest menus' top panels (2026-09-29, owner: "just have the phone on the screen (or just get rid of the blank
 * sides)"). The pack makes the chest part of generic_54.png transparent, so a phone menu (its title draws the phone,
 * U+E010 / U+E011) shows the world around the phone. Every other 9xN chest menu would then have no top panel, so for a
 * player whose pack is loaded this puts the classic panel back through the title: a white run of [-8] [panel_R]
 * [-169] (U+E020 + rows - 1, pixel-identical to vanilla's top part, tools\make-phone-ui.js) before the original title,
 * which keeps its own color (vanilla's 0x404040 when it had none). A player without the pack keeps vanilla's
 * generic_54.png, so a phone title would be boxes: they get only its visible text (the status bar's), in vanilla's
 * title color. Covers Skript menus, other plugins' GUIs and world chests (every path that goes through Paper's
 * callInventoryOpenEventWithTitle). Config `menu-panels.enabled` (default true). Glyphs U+E010-U+E01F are reserved
 * for full custom backgrounds: a title with one is never given a panel.
 */
final class MenuPanels implements Listener {
    // Code points, never literal characters: an editor can silently drop private-use characters.
    static final char PANEL_FIRST = (char) 0xE020;       // rows 1..6 = U+E020..U+E025
    static final String BEFORE = String.valueOf((char) 0xF804); // -8 (U+F804; F808 is -128): the glyph starts at the menu's left edge
    static final String AFTER = new String(new char[] {(char) 0xF808, (char) 0xF806, (char) 0xF804, (char) 0xF801}); // -128 -32 -8 -1 = -169: back to x 8
    static final TextColor TITLE_GRAY = TextColor.color(0x404040); // vanilla's container title color

    private final PhonePlugin plugin;

    MenuPanels(PhonePlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onOpen(InventoryOpenEvent event) {
        if (!plugin.getConfig().getBoolean("menu-panels.enabled", true)) return;
        HumanEntity who = event.getPlayer();
        if (!(who instanceof Player player)) return;
        InventoryView view = event.getView();
        int rows = rows(view);
        if (rows == 0) return;
        Component title = event.titleOverride();
        if (title == null) title = title(view);
        if (title == null) return;
        String plain = plain(title);
        if (packLoaded(player)) {
            if (hasPanelGlyph(plain)) return; // a phone page (or a panel added already)
            event.titleOverride(withPanel(title, rows));
        } else if (hasPhoneChars(plain)) {
            event.titleOverride(stripped(title));
        }
    }

    /** The chest rows of a 9xN menu, 0 for any other menu. */
    static int rows(InventoryView view) {
        MenuType type;
        try {
            type = view.getMenuType();
        } catch (RuntimeException e) {
            return 0;
        }
        if (type == null) return 0;
        if (type.equals(MenuType.GENERIC_9X1)) return 1;
        if (type.equals(MenuType.GENERIC_9X2)) return 2;
        if (type.equals(MenuType.GENERIC_9X3)) return 3;
        if (type.equals(MenuType.GENERIC_9X4)) return 4;
        if (type.equals(MenuType.GENERIC_9X5)) return 5;
        if (type.equals(MenuType.GENERIC_9X6)) return 6;
        return 0;
    }

    @SuppressWarnings("deprecation") // getTitle: only the fallback when title() fails
    private static Component title(InventoryView view) {
        try {
            Component c = view.title();
            if (c != null) return c;
        } catch (RuntimeException ignored) {
            // fall back to the legacy text
        }
        try {
            String s = view.getTitle();
            return s == null ? null : LegacyComponentSerializer.legacySection().deserialize(s);
        } catch (RuntimeException e) {
            return null;
        }
    }

    /** True only when the player's client said the server's pack loaded (not while it's still downloading). */
    static boolean packLoaded(Player player) {
        try {
            return player.getResourcePackStatus() == PlayerResourcePackStatusEvent.Status.SUCCESSFULLY_LOADED;
        } catch (RuntimeException e) { // "Too early to call this method at this stage"
            return false;
        }
    }

    /** The title's text: every text component's content, depth first (translations and other kinds add nothing). */
    static String plain(Component c) {
        StringBuilder sb = new StringBuilder();
        appendPlain(c, sb);
        return sb.toString();
    }

    private static void appendPlain(Component c, StringBuilder sb) {
        if (c instanceof TextComponent t) sb.append(t.content());
        for (Component child : c.children()) appendPlain(child, sb);
    }

    /** A phone background, a reserved full background or a classic panel glyph (U+E010..U+E02F). */
    static boolean hasPanelGlyph(String s) {
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch >= 0xE010 && ch <= 0xE02F) return true;
        }
        return false;
    }

    /** What a player without the pack would see as boxes: a background glyph or a pack space character. */
    static boolean hasPhoneChars(String s) {
        for (int i = 0; i < s.length(); i++) {
            if (packOnly(s.charAt(i))) return true;
        }
        return false;
    }

    private static boolean packOnly(char ch) {
        return (ch >= 0xE010 && ch <= 0xE02F) || (ch >= 0xF801 && ch <= 0xF818);
    }

    /** white [-8][panel][-169], then the original title (its own color, else vanilla's gray: siblings of a white run
     *  would not inherit white, but the wrapper makes the gray explicit either way). */
    static Component withPanel(Component title, int rows) {
        String run = BEFORE + (char) (PANEL_FIRST + rows - 1) + AFTER;
        return Component.text()
                .append(Component.text(run, NamedTextColor.WHITE))
                .append(Component.text().color(TITLE_GRAY).append(title).build())
                .build();
    }

    /** The title without the pack's characters, white text turned into vanilla's title gray (white on the vanilla
     *  panel can't be read); every other color stays. */
    static Component stripped(Component title) {
        return Component.text().color(TITLE_GRAY).append(strip(title)).build();
    }

    private static Component strip(Component c) {
        Component out = c;
        if (c instanceof TextComponent t) {
            String s = t.content();
            StringBuilder sb = new StringBuilder(s.length());
            for (int i = 0; i < s.length(); i++) {
                char ch = s.charAt(i);
                if (!packOnly(ch)) sb.append(ch);
            }
            out = t.content(sb.toString());
        }
        TextColor color = out.color();
        if (color != null && color.value() == 0xFFFFFF) out = out.color(TITLE_GRAY);
        if (!c.children().isEmpty()) {
            List<Component> kids = new ArrayList<>(c.children().size());
            for (Component child : c.children()) kids.add(strip(child));
            out = out.children(kids);
        }
        return out;
    }
}
