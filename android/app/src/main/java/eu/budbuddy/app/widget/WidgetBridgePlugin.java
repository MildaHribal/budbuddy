package eu.budbuddy.app.widget;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void refresh(PluginCall call) {
        try {
            WidgetUpdater.updateAll(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("widget refresh failed", e);
        }
    }
}
