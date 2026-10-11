package eu.budbuddy.app.widget;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/** Read-only view of the web app's "budbuddy:data" JSON (see app/types/grow.ts). */
public class WidgetData {

    public static final int DAY_MIN = 24 * 60;

    public String language = "en";
    public String lightsOn = "06:00";
    public double lightHours = 18;
    public final List<PlantRow> plants = new ArrayList<>();

    public static class PlantRow {
        public String id;
        public String name;
        public String stage;
        public int dayInStage;
        /** null = no watering reminder */
        public Integer dueIn;
    }

    public boolean cs() {
        return "cs".equals(language);
    }

    public static WidgetData load(Context context) {
        WidgetData d = new WidgetData();
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String raw = prefs.getString("budbuddy:data", null);
        if (raw == null) return d;
        try {
            JSONObject root = new JSONObject(raw);
            JSONObject s = root.optJSONObject("settings");
            if (s != null) {
                d.language = s.optString("language", "en");
                d.lightsOn = s.optString("lightsOn", "06:00");
                d.lightHours = s.optDouble("lightHours", 18);
            }
            JSONArray plants = root.optJSONArray("plants");
            JSONArray entries = root.optJSONArray("entries");
            String today = todayISO();
            if (plants != null) {
                for (int i = 0; i < plants.length(); i++) {
                    JSONObject p = plants.optJSONObject(i);
                    if (p == null || p.optBoolean("archived", false)) continue;
                    PlantRow row = new PlantRow();
                    row.id = p.optString("id");
                    row.name = p.optString("name");
                    row.stage = p.optString("stage", "seedling");
                    row.dayInStage = Math.max(0, daysBetween(stageStart(p), today));
                    int interval = p.isNull("wateringInterval") ? 0 : p.optInt("wateringInterval", 0);
                    if (interval > 0) {
                        String from = lastWater(entries, row.id);
                        if (from == null) from = p.optString("startDate", today);
                        row.dueIn = daysBetween(today, addDays(from, interval));
                    }
                    d.plants.add(row);
                }
            }
        } catch (Exception ignored) {}
        return d;
    }

    private static String stageStart(JSONObject p) {
        String stage = p.optString("stage");
        JSONArray h = p.optJSONArray("stageHistory");
        if (h != null) {
            for (int i = h.length() - 1; i >= 0; i--) {
                JSONObject c = h.optJSONObject(i);
                if (c != null && stage.equals(c.optString("stage"))) return c.optString("date");
            }
        }
        return p.optString("startDate", todayISO());
    }

    private static String lastWater(JSONArray entries, String plantId) {
        if (entries == null) return null;
        String date = null;
        String created = "";
        for (int i = 0; i < entries.length(); i++) {
            JSONObject e = entries.optJSONObject(i);
            if (e == null || !plantId.equals(e.optString("plantId"))) continue;
            String type = e.optString("type");
            if (!"water".equals(type) && !"feed".equals(type)) continue;
            String d = e.optString("date");
            String c = e.optString("createdAt");
            int cmp = date == null ? 1 : d.compareTo(date);
            if (cmp > 0 || (cmp == 0 && c.compareTo(created) > 0)) {
                date = d;
                created = c;
            }
        }
        return date;
    }

    // ── dates (local calendar days, noon-anchored like app/utils/date.ts) ──

    public static String todayISO() {
        Calendar c = Calendar.getInstance();
        return String.format(java.util.Locale.ROOT, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    static Calendar parse(String iso) {
        Calendar c = Calendar.getInstance();
        c.clear();
        try {
            String[] p = iso.substring(0, 10).split("-");
            c.set(Integer.parseInt(p[0]), Integer.parseInt(p[1]) - 1, Integer.parseInt(p[2]), 12, 0, 0);
        } catch (Exception e) {
            c.setTimeInMillis(System.currentTimeMillis());
        }
        return c;
    }

    static String addDays(String iso, int days) {
        Calendar c = parse(iso);
        c.add(Calendar.DAY_OF_MONTH, days);
        return String.format(java.util.Locale.ROOT, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    static int daysBetween(String from, String to) {
        return (int) Math.round((parse(to).getTimeInMillis() - parse(from).getTimeInMillis()) / 86_400_000.0);
    }

    // ── light schedule, mirrors app/utils/light.ts ──

    public static class Light {
        public boolean isOn;
        /** ms until the next switch, 0 when lights are always on/off */
        public long msLeft;
        /** 0–1 position of now within the dial, 0 = lights-on */
        public float position;
        public String onLabel;
        public String offLabel;
        public int litMin;
    }

    public Light light(long nowMs) {
        int on = parseHHMM(lightsOn);
        int lit = (int) Math.round(Math.max(0, Math.min(24, lightHours)) * 60);
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(nowMs);
        double nowMin = c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE) + c.get(Calendar.SECOND) / 60.0 + c.get(Calendar.MILLISECOND) / 60000.0;
        double since = ((nowMin - on) % DAY_MIN + DAY_MIN) % DAY_MIN;
        boolean isOn = lit == DAY_MIN || since < lit;
        Light l = new Light();
        l.litMin = lit;
        l.isOn = lit > 0 && isOn;
        l.msLeft = lit == DAY_MIN || lit == 0 ? 0 : Math.round(((isOn ? lit : DAY_MIN) - since) * 60000);
        l.position = (float) (Math.floor(since) / DAY_MIN);
        l.onLabel = hhmm(on);
        l.offLabel = hhmm(on + lit);
        return l;
    }

    static int parseHHMM(String v) {
        try {
            String[] p = v.split(":");
            return Integer.parseInt(p[0]) * 60 + (p.length > 1 ? Integer.parseInt(p[1]) : 0);
        } catch (Exception e) {
            return 0;
        }
    }

    static String hhmm(int min) {
        int m = ((min % DAY_MIN) + DAY_MIN) % DAY_MIN;
        return String.format(java.util.Locale.ROOT, "%02d:%02d", m / 60, m % 60);
    }

    public String hoursLabel() {
        double h = Math.max(0, Math.min(24, lightHours));
        return h == Math.floor(h) ? String.valueOf((int) h) : String.valueOf(h);
    }

    public String darkHoursLabel() {
        double h = 24 - Math.max(0, Math.min(24, lightHours));
        return h == Math.floor(h) ? String.valueOf((int) h) : String.valueOf(h);
    }
}
