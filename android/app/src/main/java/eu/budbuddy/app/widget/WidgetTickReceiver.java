package eu.budbuddy.app.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class WidgetTickReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        WidgetUpdater.updateAll(context);
    }
}
