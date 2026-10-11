package eu.budbuddy.app.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;
import eu.budbuddy.app.R;

public class PlantsWidget extends BaseWidget {

    private static final int[] ROWS = { R.id.plant_row_0, R.id.plant_row_1, R.id.plant_row_2 };
    private static final int[] DOTS = { R.id.plant_dot_0, R.id.plant_dot_1, R.id.plant_dot_2 };
    private static final int[] NAMES = { R.id.plant_name_0, R.id.plant_name_1, R.id.plant_name_2 };
    private static final int[] SUBS = { R.id.plant_sub_0, R.id.plant_sub_1, R.id.plant_sub_2 };
    private static final int[] WATER = { R.id.plant_water_0, R.id.plant_water_1, R.id.plant_water_2 };

    static void render(Context context, AppWidgetManager mgr, int id, WidgetData data) {
        boolean cs = data.cs();
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_plants);
        v.setTextViewText(R.id.plants_title, Texts.t(cs, "My plants", "Moje rostliny"));
        v.setTextViewText(R.id.plants_count, data.plants.isEmpty() ? "" : String.valueOf(data.plants.size()));
        v.setOnClickPendingIntent(R.id.plants_header, WidgetUpdater.open(context, "/plants"));
        v.setOnClickPendingIntent(R.id.plants_root, WidgetUpdater.open(context, "/plants"));

        int h = WidgetUpdater.sizeDp(mgr, id, 250, 110)[1];
        int max = Math.max(1, Math.min(ROWS.length, (h - 44) / 38));
        int shown = Math.min(max, data.plants.size());
        for (int i = 0; i < ROWS.length; i++) {
            if (i >= shown) {
                v.setViewVisibility(ROWS[i], View.GONE);
                continue;
            }
            WidgetData.PlantRow p = data.plants.get(i);
            v.setViewVisibility(ROWS[i], View.VISIBLE);
            v.setInt(DOTS[i], "setColorFilter", Texts.stageColor(p.stage));
            v.setTextViewText(NAMES[i], p.name);
            v.setTextViewText(SUBS[i], Texts.stageDay(cs, p.stage, p.dayInStage));
            if (p.dueIn == null) {
                v.setViewVisibility(WATER[i], View.GONE);
            } else {
                v.setViewVisibility(WATER[i], View.VISIBLE);
                v.setTextViewText(WATER[i], Texts.water(cs, p.dueIn));
                v.setTextColor(WATER[i], p.dueIn < 0 ? 0xffff5fa2 : p.dueIn == 0 ? LightWidget.LAMP : LightWidget.MUTED);
            }
            v.setOnClickPendingIntent(ROWS[i], WidgetUpdater.open(context, "/plants/" + p.id));
        }
        v.setViewVisibility(R.id.plants_empty, shown == 0 ? View.VISIBLE : View.GONE);
        v.setTextViewText(R.id.plants_empty, Texts.t(cs, "No plants yet. Tap to add one.", "Zatím žádné rostliny. Klepni a přidej."));
        mgr.updateAppWidget(id, v);
    }
}
