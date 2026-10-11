package eu.budbuddy.app.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.view.View;
import android.widget.RemoteViews;
import eu.budbuddy.app.R;
import java.io.File;
import java.io.FileInputStream;
import org.json.JSONObject;

public class GalleryWidget extends BaseWidget {

    /** Keeps the RemoteViews parcel well under the binder limit. */
    private static final int MAX_PIXELS = 130_000;

    static void render(Context context, AppWidgetManager mgr, int id, WidgetData data) {
        boolean cs = data.cs();
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_gallery);
        v.setOnClickPendingIntent(R.id.gallery_root, WidgetUpdater.open(context, "/gallery"));

        File dir = new File(context.getFilesDir(), "widget");
        File img = new File(dir, "latest.jpg");
        Bitmap photo = img.exists() ? BitmapFactory.decodeFile(img.getAbsolutePath()) : null;
        if (photo == null) {
            v.setViewVisibility(R.id.gallery_photo, View.GONE);
            v.setViewVisibility(R.id.gallery_caption, View.GONE);
            v.setViewVisibility(R.id.gallery_empty, View.VISIBLE);
            v.setTextViewText(R.id.gallery_empty, Texts.t(cs, "No photos yet.\nSnap your first plant.", "Zatím žádné fotky.\nVyfoť svou první rostlinu."));
            mgr.updateAppWidget(id, v);
            return;
        }

        int[] size = WidgetUpdater.sizeDp(mgr, id, 110, 110);
        float aspect = size[0] / (float) Math.max(1, size[1]);
        int h = (int) Math.sqrt(MAX_PIXELS / Math.max(0.2f, aspect));
        int w = Math.round(h * aspect);
        float radius = WidgetUpdater.px(context, 22) * (w / (float) Math.max(1, WidgetUpdater.px(context, size[0])));
        v.setImageViewBitmap(R.id.gallery_photo, cropRounded(photo, w, h, radius));
        photo.recycle();
        v.setViewVisibility(R.id.gallery_photo, View.VISIBLE);
        v.setViewVisibility(R.id.gallery_empty, View.GONE);

        JSONObject meta = readMeta(new File(dir, "latest.json"));
        String name = meta == null ? "" : meta.optString("plant");
        String date = meta == null ? "" : meta.optString(cs ? "dateCs" : "dateEn", meta.optString("date"));
        v.setViewVisibility(R.id.gallery_caption, name.isEmpty() ? View.GONE : View.VISIBLE);
        v.setTextViewText(R.id.gallery_name, name);
        v.setTextViewText(R.id.gallery_date, date);
        mgr.updateAppWidget(id, v);
    }

    static Bitmap cropRounded(Bitmap src, int w, int h, float radius) {
        Bitmap out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(out);
        float scale = Math.max(w / (float) src.getWidth(), h / (float) src.getHeight());
        Matrix m = new Matrix();
        m.setScale(scale, scale);
        m.postTranslate((w - src.getWidth() * scale) / 2f, (h - src.getHeight() * scale) / 2f);
        BitmapShader shader = new BitmapShader(src, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP);
        shader.setLocalMatrix(m);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        p.setShader(shader);
        RectF rect = new RectF(0, 0, w, h);
        c.drawRoundRect(rect, radius, radius, p);
        Paint shade = new Paint(Paint.ANTI_ALIAS_FLAG);
        shade.setShader(new LinearGradient(0, h * 0.45f, 0, h, 0x00000000, 0xc0000000, Shader.TileMode.CLAMP));
        c.drawRoundRect(rect, radius, radius, shade);
        return out;
    }

    private static JSONObject readMeta(File f) {
        if (!f.exists()) return null;
        try (FileInputStream in = new FileInputStream(f)) {
            byte[] buf = new byte[(int) f.length()];
            int n = in.read(buf);
            return new JSONObject(new String(buf, 0, Math.max(0, n), "UTF-8"));
        } catch (Exception e) {
            return null;
        }
    }
}
