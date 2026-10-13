package eu.budbuddy.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import eu.budbuddy.app.backup.BackupFolderPlugin;
import eu.budbuddy.app.widget.WidgetBridgePlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        registerPlugin(BackupFolderPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
