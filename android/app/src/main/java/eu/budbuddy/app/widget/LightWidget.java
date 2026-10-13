package eu.budbuddy.app.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.os.Build;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import eu.budbuddy.app.R;

public class LightWidget extends BaseWidget {

    static final int LEAF = 0xff3dd173;
    static final int LAMP = 0xfff2b544;
    static final int TEXT = 0xfff2f4f1;
    static final int MUTED = 0xff838b86;

    static void render(Context context, AppWidgetManager mgr, int id, WidgetData data) {
        boolean cs = data.cs();
        long now = System.currentTimeMillis();
        WidgetData.Light l = data.light(now);
        int[] size = WidgetUpdater.sizeDp(mgr, id, 250, 110);
        int ringDp = Math.max(64, Math.min(size[1] - 28, (int) (size[0] * 0.46f)));
        int ringPx = Math.min(WidgetUpdater.px(context, ringDp), 420);

        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_light);
        v.setImageViewBitmap(R.id.light_ring, ring(ringPx, data, l));

        boolean always = l.litMin >= WidgetData.DAY_MIN;
        boolean never = l.litMin <= 0;
        if (always || never) {
            v.setTextViewText(R.id.light_lead, always ? Texts.t(cs, "Lights on", "Světlo svítí") : Texts.t(cs, "Lights", "Světlo"));
            v.setTextViewText(R.id.light_value, always ? Texts.t(cs, "all day", "celý den") : Texts.t(cs, "off", "vypnuto"));
            v.setTextColor(R.id.light_value, always ? LAMP : TEXT);
            v.setViewVisibility(R.id.light_value, View.VISIBLE);
            v.setViewVisibility(R.id.light_chrono, View.GONE);
        } else {
            v.setTextViewText(R.id.light_lead, l.isOn ? Texts.t(cs, "Lights off in", "Zhasne za") : Texts.t(cs, "Lights on in", "Rozsvítí se za"));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                v.setChronometer(R.id.light_chrono, SystemClock.elapsedRealtime() + l.msLeft, null, true);
                v.setChronometerCountDown(R.id.light_chrono, true);
                v.setTextColor(R.id.light_chrono, l.isOn ? LAMP : TEXT);
                v.setViewVisibility(R.id.light_chrono, View.VISIBLE);
                v.setViewVisibility(R.id.light_value, View.GONE);
            } else {
                long min = l.msLeft / 60000;
                v.setTextViewText(R.id.light_value, (min / 60 > 0 ? min / 60 + " h " : "") + min % 60 + " min");
                v.setTextColor(R.id.light_value, l.isOn ? LAMP : TEXT);
                v.setViewVisibility(R.id.light_value, View.VISIBLE);
                v.setViewVisibility(R.id.light_chrono, View.GONE);
            }
        }
        v.setTextViewText(R.id.light_lit, Texts.t(cs, "Lit ", "Svítí ") + l.onLabel + " – " + l.offLabel);
        v.setTextViewText(R.id.light_dark, Texts.t(cs, "Dark ", "Tma ") + l.offLabel + " – " + l.onLabel);
        v.setViewVisibility(R.id.light_dark_row, always || never ? View.GONE : View.VISIBLE);
        v.setViewVisibility(R.id.light_lit_row, never ? View.GONE : View.VISIBLE);
        v.setOnClickPendingIntent(R.id.light_root, WidgetUpdater.open(context, "/"));
        mgr.updateAppWidget(id, v);
    }

    /** Port of PhotoperiodRing.vue (180×180 viewBox). */
    static Bitmap ring(int px, WidgetData data, WidgetData.Light l) {
        Bitmap bmp = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        float s = px / 180f;
        c.scale(s, s);
        float r = 70;
        RectF oval = new RectF(90 - r, 90 - r, 90 + r, 90 + r);
        float litSweep = l.litMin / (float) WidgetData.DAY_MIN * 360f;

        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setColor(0xff171a18);
        p.setStrokeWidth(12);
        c.drawArc(oval, 0, 360, false, p);

        if (litSweep < 360) {
            p.setColor(0xff2a302d);
            p.setStrokeWidth(4);
            c.drawArc(oval, -90 + litSweep, 360 - litSweep, false, p);
        }
        if (litSweep > 0) {
            int alpha = l.isOn ? 255 : 140;
            p.setStrokeWidth(10);
            p.setColor(LEAF);
            p.setAlpha((int) (alpha * 0.55f));
            p.setMaskFilter(new BlurMaskFilter(4, BlurMaskFilter.Blur.NORMAL));
            c.drawArc(oval, -90, litSweep, false, p);
            p.setMaskFilter(null);
            p.setAlpha(alpha);
            c.drawArc(oval, -90, litSweep, false, p);
        }

        double a = l.position * 2 * Math.PI - Math.PI / 2;
        float mx = (float) (90 + r * Math.cos(a));
        float my = (float) (90 + r * Math.sin(a));
        Paint m = new Paint(Paint.ANTI_ALIAS_FLAG);
        m.setColor(LAMP);
        m.setAlpha(204);
        m.setMaskFilter(new BlurMaskFilter(4, BlurMaskFilter.Blur.NORMAL));
        c.drawCircle(mx, my, 9, m);
        m.setMaskFilter(null);
        m.setAlpha(255);
        m.setColor(0xfff2f4f1);
        c.drawCircle(mx, my, 5.5f, m);
        m.setStyle(Paint.Style.STROKE);
        m.setStrokeWidth(2);
        m.setColor(LAMP);
        c.drawCircle(mx, my, 5.5f, m);

        Paint val = new Paint(Paint.ANTI_ALIAS_FLAG);
        val.setTextSize(26);
        val.setTypeface(Typeface.create("sans-serif-light", Typeface.NORMAL));
        String on = data.hoursLabel();
        String off = data.darkHoursLabel();
        float wOn = val.measureText(on);
        float wSlash = val.measureText("/");
        float x = 90 - (wOn + wSlash + val.measureText(off)) / 2;
        val.setColor(TEXT);
        c.drawText(on, x, 100, val);
        val.setColor(MUTED);
        c.drawText("/", x + wOn, 100, val);
        val.setColor(TEXT);
        c.drawText(off, x + wOn + wSlash, 100, val);
        return bmp;
    }
}
