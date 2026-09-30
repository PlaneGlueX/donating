package dev.donating.phone;

import me.neznamy.tab.api.TabAPI;
import me.neznamy.tab.api.TabPlayer;
import me.neznamy.tab.api.scoreboard.ScoreboardManager;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;

/**
 * TAB's sidebar for one player (CarCam hides it during the chase view: at a usual GUI scale it covers the top of the car
 * key's minimap in the corner). TAB is a soft dependency: callers check present() first. TAB's remember-toggle-choice is
 * false, so a sidebar hidden here never stays hidden past a restart.
 */
final class Sidebar {
    private Sidebar() { }

    static boolean present() {
        return Bukkit.getPluginManager().getPlugin("TAB") != null;
    }

    private static ScoreboardManager manager() {
        TabAPI api = TabAPI.getInstance();
        return api == null ? null : api.getScoreboardManager();
    }

    private static TabPlayer tab(Player p) {
        TabAPI api = TabAPI.getInstance();
        TabPlayer t = api == null ? null : api.getPlayer(p.getUniqueId());
        return t != null && t.isLoaded() ? t : null;
    }

    /** Hides the player's sidebar if it shows; true when this call hid it (the caller shows it again later). */
    static boolean hide(Player p) {
        ScoreboardManager sm = manager();
        TabPlayer t = tab(p);
        if (sm == null || t == null || !sm.hasScoreboardVisible(t)) return false;
        sm.setScoreboardVisible(t, false, false);
        return true;
    }

    /** Whether the player's sidebar shows now (false without TAB's scoreboard or before TAB loaded them). */
    static boolean visible(Player p) {
        ScoreboardManager sm = manager();
        TabPlayer t = tab(p);
        return sm != null && t != null && sm.hasScoreboardVisible(t);
    }

    static void show(Player p) {
        ScoreboardManager sm = manager();
        TabPlayer t = tab(p);
        if (sm != null && t != null && !sm.hasScoreboardVisible(t)) sm.setScoreboardVisible(t, true, false);
    }
}
