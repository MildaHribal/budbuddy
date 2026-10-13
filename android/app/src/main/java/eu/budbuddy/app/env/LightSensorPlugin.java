package eu.budbuddy.app.env;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Streams the ambient light sensor (TYPE_LIGHT, lux) to the web layer as "lux" events. */
@CapacitorPlugin(name = "LightSensor")
public class LightSensorPlugin extends Plugin implements SensorEventListener {

    private SensorManager manager;
    private Sensor sensor;
    private boolean running = false;
    /** the web layer asked for readings; survives pause/resume */
    private boolean wanted = false;

    @Override
    public void load() {
        manager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        sensor = manager == null ? null : manager.getDefaultSensor(Sensor.TYPE_LIGHT);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", sensor != null);
        if (sensor != null) {
            ret.put("name", sensor.getName());
            ret.put("maxLux", sensor.getMaximumRange());
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (sensor == null) {
            call.reject("No ambient light sensor", "UNAVAILABLE");
            return;
        }
        wanted = true;
        if (!running) {
            running = manager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_UI);
        }
        if (running) call.resolve();
        else call.reject("Light sensor could not be started", "UNAVAILABLE");
    }

    @PluginMethod
    public void stop(PluginCall call) {
        wanted = false;
        stopSensor();
        call.resolve();
    }

    private void stopSensor() {
        if (running && manager != null) manager.unregisterListener(this);
        running = false;
    }

    @Override
    protected void handleOnPause() {
        stopSensor();
    }

    @Override
    protected void handleOnResume() {
        if (wanted && !running && sensor != null && manager != null) {
            running = manager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_UI);
        }
    }

    @Override
    protected void handleOnDestroy() {
        wanted = false;
        stopSensor();
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.values == null || event.values.length == 0) return;
        JSObject data = new JSObject();
        data.put("lux", event.values[0]);
        data.put("accuracy", event.accuracy);
        notifyListeners("lux", data);
    }

    @Override
    public void onAccuracyChanged(Sensor s, int accuracy) {}
}
