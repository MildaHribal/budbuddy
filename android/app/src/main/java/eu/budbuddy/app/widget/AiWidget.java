package eu.budbuddy.app.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;
import eu.budbuddy.app.R;

public class AiWidget extends BaseWidget {

    static void render(Context context, AppWidgetManager mgr, int id, WidgetData data) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_ai);
        v.setTextViewText(R.id.ai_hint, Texts.t(data.cs(), "Ask AI about your plants…", "Zeptej se AI na své rostliny…"));
        v.setOnClickPendingIntent(R.id.ai_root, WidgetUpdater.open(context, "/ai-assistant"));
        mgr.updateAppWidget(id, v);
    }
}
