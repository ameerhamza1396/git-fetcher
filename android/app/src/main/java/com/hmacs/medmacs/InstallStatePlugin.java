package com.hmacs.medmacs;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.IOException;

@CapacitorPlugin(name = "InstallState")
public class InstallStatePlugin extends Plugin {
    private static final String INSTALL_MARKER = "medmacs_install_initialized";

    @PluginMethod
    public void consumeFreshInstall(PluginCall call) {
        File marker = new File(getContext().getNoBackupFilesDir(), INSTALL_MARKER);
        boolean freshInstall = !marker.exists();

        if (freshInstall) {
            try {
                File parent = marker.getParentFile();
                if (parent != null && !parent.exists()) {
                    parent.mkdirs();
                }
                marker.createNewFile();
            } catch (IOException error) {
                call.reject("Unable to initialize install marker.", error);
                return;
            }
        }

        JSObject result = new JSObject();
        result.put("freshInstall", freshInstall);
        call.resolve(result);
    }
}
