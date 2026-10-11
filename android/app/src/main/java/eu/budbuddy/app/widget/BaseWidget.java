package eu.budbuddy.app.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;

public abstract class BaseWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        WidgetUpdater.updateAll(context);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager mgr, int id, Bundle options) {
        WidgetUpdater.updateAll(context);
    }

    @Override
    public void onDisabled(Context context) {
        WidgetUpdater.schedule(context, WidgetData.load(context));
    }
}
