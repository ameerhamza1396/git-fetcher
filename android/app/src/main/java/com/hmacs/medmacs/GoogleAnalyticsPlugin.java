package com.hmacs.medmacs;

import android.os.Bundle;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.analytics.FirebaseAnalytics;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Iterator;

@CapacitorPlugin(name = "GoogleAnalytics")
public class GoogleAnalyticsPlugin extends Plugin {
    @PluginMethod
    public void setConsent(PluginCall call) {
        boolean granted = Boolean.TRUE.equals(call.getBoolean("granted", false));
        FirebaseAnalytics analytics = FirebaseAnalytics.getInstance(getContext());
        analytics.setAnalyticsCollectionEnabled(granted);
        analytics.setConsent(new java.util.EnumMap<FirebaseAnalytics.ConsentType, FirebaseAnalytics.ConsentStatus>(FirebaseAnalytics.ConsentType.class) {{
            put(FirebaseAnalytics.ConsentType.ANALYTICS_STORAGE, granted ? FirebaseAnalytics.ConsentStatus.GRANTED : FirebaseAnalytics.ConsentStatus.DENIED);
            put(FirebaseAnalytics.ConsentType.AD_STORAGE, granted ? FirebaseAnalytics.ConsentStatus.GRANTED : FirebaseAnalytics.ConsentStatus.DENIED);
            put(FirebaseAnalytics.ConsentType.AD_USER_DATA, granted ? FirebaseAnalytics.ConsentStatus.GRANTED : FirebaseAnalytics.ConsentStatus.DENIED);
            put(FirebaseAnalytics.ConsentType.AD_PERSONALIZATION, FirebaseAnalytics.ConsentStatus.DENIED);
        }});
        call.resolve();
    }

    @PluginMethod
    public void logEvent(PluginCall call) {
        String name = call.getString("name");
        if (name == null || name.trim().isEmpty()) {
            call.reject("Event name is required");
            return;
        }
        FirebaseAnalytics.getInstance(getContext()).logEvent(name, toBundle(call.getObject("parameters", new JSObject())));
        call.resolve();
    }

    private Bundle toBundle(JSONObject object) {
        Bundle bundle = new Bundle();
        Iterator<String> keys = object.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            Object value = object.opt(key);
            if (value instanceof Integer || value instanceof Long) bundle.putLong(key, ((Number) value).longValue());
            else if (value instanceof Number) bundle.putDouble(key, ((Number) value).doubleValue());
            else if (value instanceof Boolean) bundle.putLong(key, (Boolean) value ? 1L : 0L);
            else if (value instanceof JSONObject) bundle.putBundle(key, toBundle((JSONObject) value));
            else if (value instanceof JSONArray) {
                JSONArray array = (JSONArray) value;
                Bundle[] bundles = new Bundle[array.length()];
                for (int i = 0; i < array.length(); i++) bundles[i] = toBundle(array.optJSONObject(i));
                bundle.putParcelableArray(key, bundles);
            } else if (value != null && value != JSONObject.NULL) bundle.putString(key, String.valueOf(value));
        }
        return bundle;
    }
}
