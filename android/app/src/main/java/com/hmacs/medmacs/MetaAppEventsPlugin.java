package com.hmacs.medmacs;

import android.app.Application;
import android.os.Bundle;

import com.facebook.FacebookSdk;
import com.facebook.appevents.AppEventsLogger;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Iterator;

@CapacitorPlugin(name = "MetaAppEvents")
public class MetaAppEventsPlugin extends Plugin {
    @PluginMethod
    public void setConsent(PluginCall call) {
        boolean granted = Boolean.TRUE.equals(call.getBoolean("granted", false));

        FacebookSdk.setAutoInitEnabled(granted);
        FacebookSdk.setAutoLogAppEventsEnabled(granted);
        FacebookSdk.setAdvertiserIDCollectionEnabled(granted);

        if (granted) {
            FacebookSdk.fullyInitialize();
            AppEventsLogger.activateApp((Application) getContext().getApplicationContext());
        }

        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void logEvent(PluginCall call) {
        String name = call.getString("name");
        if (name == null || name.trim().isEmpty()) {
            call.reject("Event name is required");
            return;
        }

        Bundle parameters = new Bundle();
        JSObject input = call.getObject("parameters", new JSObject());
        Iterator<String> keys = input.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            Object value = input.opt(key);
            if (value instanceof Number) {
                parameters.putDouble(key, ((Number) value).doubleValue());
            } else if (value instanceof Boolean) {
                parameters.putInt(key, (Boolean) value ? 1 : 0);
            } else if (value != null) {
                parameters.putString(key, String.valueOf(value));
            }
        }

        AppEventsLogger.newLogger(getContext()).logEvent(name, parameters);
        call.resolve();
    }
}
