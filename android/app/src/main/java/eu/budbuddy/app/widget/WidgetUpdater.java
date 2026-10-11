package eu.budbuddy.app.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.TypedValue;
import eu.budbuddy.app.MainActivity;
import java.util.Calendar;

public final class WidgetUpdater {

    private static final long TICK_MS = 20 * 60_000L;

    private WidgetUpdater() {}

    public static void updateAll(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        WidgetData data = WidgetData.load(context);
        for (int id : ids(context, mgr, LightWidget.class)) LightWidget.render(context, mgr, id, data);
        for (int id : ids(context, mgr, PlantsWidget.class)) PlantsWidget.render(context, mgr, id, data);
        for (int id : ids(context, mgr, GalleryWidget.class)) GalleryWidget.render(context, mgr, id, data);
        for (int id : ids(context, mgr, AiWidget.class)) AiWidget.render(context, mgr, id, data);
        schedule(context, data);
    }

    static int[] ids(Context context, AppWidgetManager mgr, Class<?> provider) {
        return mgr.getAppWidgetIds(new ComponentName(context, provider));
    }

    /** One inexact alarm: next lights switch / periodic ring tick / midnight day roll-over. */
    static void schedule(Context context, WidgetData data) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        boolean light = ids(context, mgr, LightWidget.class).length > 0;
        boolean plants = ids(context, mgr, PlantsWidget.class).length > 0;
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = PendingIntent.getBroadcast(context, 0, new Intent(context, WidgetTickReceiver.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (am == null) return;
        if (!light && !plants) {
            am.cancel(pi);
            return;
        }
        long now = System.currentTimeMillis();
        long next = Long.MAX_VALUE;
        long window = 5 * 60_000L;
        if (light) {
            next = now + TICK_MS;
            WidgetData.Light l = data.light(now);
            if (l.msLeft > 0 && now + l.msLeft + 1000 < next) {
                next = now + l.msLeft + 1000;
                window = 30_000L;
            }
        }
        if (plants) {
            Calendar c = Calendar.getInstance();
            c.add(Calendar.DAY_OF_MONTH, 1);
            c.set(Calendar.HOUR_OF_DAY, 0);
            c.set(Calendar.MINUTE, 0);
            c.set(Calendar.SECOND, 30);
            if (c.getTimeInMillis() < next) {
                next = c.getTimeInMillis();
                window = 5 * 60_000L;
            }
        }
        am.setWindow(AlarmManager.RTC, next, window, pi);
    }

    static PendingIntent open(Context context, String path) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("budbuddy://app" + path), context, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, path.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Current widget size in dp (portrait: min width × max height). */
    static int[] sizeDp(AppWidgetManager mgr, int id, int defW, int defH) {
        Bundle o = mgr.getAppWidgetOptions(id);
        int w = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        int h = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
        return new int[] { w > 0 ? w : defW, h > 0 ? h : defH };
    }

    static int px(Context context, float dp) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, context.getResources().getDisplayMetrics()));
    }
}
