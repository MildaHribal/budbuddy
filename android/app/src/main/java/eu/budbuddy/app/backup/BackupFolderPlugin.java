package eu.budbuddy.app.backup;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.UriPermission;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Automatic backups into a folder the user picks once (Storage Access Framework),
 * e.g. a synced Drive or Nextcloud folder. Survives reinstalls because the folder is
 * not owned by the app; access is kept with a persistable URI permission.
 */
@CapacitorPlugin(name = "BackupFolder")
public class BackupFolderPlugin extends Plugin {

    @PluginMethod
    public void pick(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION |
            Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
            Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION |
            Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
        );
        startActivityForResult(call, intent, "pickResult");
    }

    @ActivityCallback
    private void pickResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            JSObject ret = new JSObject();
            ret.put("cancelled", true);
            call.resolve(ret);
            return;
        }
        Uri tree = data.getData();
        try {
            getContext().getContentResolver().takePersistableUriPermission(
                tree,
                Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            );
        } catch (SecurityException e) {
            call.reject("Could not keep access to the folder", e);
            return;
        }
        JSObject ret = new JSObject();
        ret.put("cancelled", false);
        ret.put("uri", tree.toString());
        ret.put("name", folderName(tree));
        call.resolve(ret);
    }

    /** Whether the app still holds write access to the folder. */
    @PluginMethod
    public void check(PluginCall call) {
        String uri = call.getString("uri");
        JSObject ret = new JSObject();
        boolean ok = false;
        if (uri != null) {
            for (UriPermission p : getContext().getContentResolver().getPersistedUriPermissions()) {
                if (p.getUri().toString().equals(uri) && p.isWritePermission()) {
                    ok = true;
                    break;
                }
            }
        }
        ret.put("ok", ok);
        if (ok) ret.put("name", folderName(Uri.parse(uri)));
        call.resolve(ret);
    }

    /** Copies a file from the app cache (Filesystem plugin uri/path) into the folder. */
    @PluginMethod
    public void copyIn(PluginCall call) {
        String uri = call.getString("uri");
        String name = call.getString("name");
        String source = call.getString("source");
        if (uri == null || name == null || source == null) {
            call.reject("uri, name and source are required");
            return;
        }
        ContentResolver resolver = getContext().getContentResolver();
        Uri tree = Uri.parse(uri);
        Uri target = null;
        try {
            Uri parent = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
            target = DocumentsContract.createDocument(resolver, parent, "application/json", name);
            if (target == null) throw new IllegalStateException("createDocument returned null");
            try (InputStream in = resolver.openInputStream(sourceUri(source)); OutputStream out = resolver.openOutputStream(target, "w")) {
                if (in == null || out == null) throw new IllegalStateException("could not open streams");
                copy(in, out);
            }
            JSObject ret = new JSObject();
            ret.put("id", DocumentsContract.getDocumentId(target));
            ret.put("name", displayName(resolver, target, name));
            call.resolve(ret);
        } catch (Exception e) {
            // do not leave a half-written file behind
            if (target != null) {
                try {
                    DocumentsContract.deleteDocument(resolver, target);
                } catch (Exception ignored) {
                    // nothing more to do
                }
            }
            call.reject("Backup could not be written", e);
        }
    }

    @PluginMethod
    public void list(PluginCall call) {
        String uri = call.getString("uri");
        if (uri == null) {
            call.reject("uri is required");
            return;
        }
        Uri tree = Uri.parse(uri);
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
        String[] projection = {
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_SIZE,
            DocumentsContract.Document.COLUMN_LAST_MODIFIED,
            DocumentsContract.Document.COLUMN_MIME_TYPE
        };
        JSArray files = new JSArray();
        try (Cursor c = getContext().getContentResolver().query(children, projection, null, null, null)) {
            while (c != null && c.moveToNext()) {
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(c.getString(4))) continue;
                JSObject f = new JSObject();
                f.put("id", c.getString(0));
                f.put("name", c.getString(1));
                f.put("size", c.isNull(2) ? 0 : c.getLong(2));
                f.put("modified", c.isNull(3) ? 0 : c.getLong(3));
                files.put(f);
            }
        } catch (Exception e) {
            call.reject("Folder could not be read", e);
            return;
        }
        JSObject ret = new JSObject();
        ret.put("files", files);
        call.resolve(ret);
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String uri = call.getString("uri");
        String id = call.getString("id");
        if (uri == null || id == null) {
            call.reject("uri and id are required");
            return;
        }
        try {
            Uri doc = DocumentsContract.buildDocumentUriUsingTree(Uri.parse(uri), id);
            DocumentsContract.deleteDocument(getContext().getContentResolver(), doc);
            call.resolve();
        } catch (Exception e) {
            call.reject("Backup could not be deleted", e);
        }
    }

    /** Copies a backup from the folder into the app cache so the Filesystem plugin can read it. */
    @PluginMethod
    public void copyOut(PluginCall call) {
        String uri = call.getString("uri");
        String id = call.getString("id");
        String dest = call.getString("dest");
        if (uri == null || id == null || dest == null || dest.contains("/")) {
            call.reject("uri, id and a plain dest file name are required");
            return;
        }
        File out = new File(getContext().getCacheDir(), dest);
        Uri doc = DocumentsContract.buildDocumentUriUsingTree(Uri.parse(uri), id);
        try (InputStream in = getContext().getContentResolver().openInputStream(doc); OutputStream os = new FileOutputStream(out)) {
            if (in == null) throw new IllegalStateException("could not open backup");
            copy(in, os);
            JSObject ret = new JSObject();
            ret.put("path", dest);
            call.resolve(ret);
        } catch (Exception e) {
            //noinspection ResultOfMethodCallIgnored
            out.delete();
            call.reject("Backup could not be read", e);
        }
    }

    private static void copy(InputStream in, OutputStream out) throws java.io.IOException {
        byte[] buf = new byte[64 * 1024];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        out.flush();
    }

    private Uri sourceUri(String source) {
        if (source.startsWith("file:") || source.startsWith("content:")) return Uri.parse(source);
        return Uri.fromFile(new File(source));
    }

    private String folderName(Uri tree) {
        try {
            Uri doc = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
            return displayName(getContext().getContentResolver(), doc, tree.getLastPathSegment());
        } catch (Exception e) {
            return tree.getLastPathSegment();
        }
    }

    private static String displayName(ContentResolver resolver, Uri doc, String fallback) {
        try (Cursor c = resolver.query(doc, new String[] { DocumentsContract.Document.COLUMN_DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst() && !c.isNull(0)) return c.getString(0);
        } catch (Exception ignored) {
            // fall back below
        }
        return fallback;
    }
}
