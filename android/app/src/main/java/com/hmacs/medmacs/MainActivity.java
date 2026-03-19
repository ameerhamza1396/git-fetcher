package com.hmacs.medmacs;

import android.os.Bundle;
import java.io.File;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // [ATTEMPT 9] FORCE RESET CAPGO CACHE
        try {
            File versionsDir = new File(getFilesDir(), "versions");
            if (versionsDir.exists()) {
                deleteRecursive(versionsDir);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Only keep your custom plugins here
        registerPlugin(GoogleNativeAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }

    private void deleteRecursive(File fileOrDirectory) {
        if (fileOrDirectory.isDirectory()) {
            File[] children = fileOrDirectory.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        fileOrDirectory.delete();
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }
}