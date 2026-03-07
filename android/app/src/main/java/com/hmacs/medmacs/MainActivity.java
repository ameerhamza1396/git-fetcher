package com.hmacs.medmacs;

import android.animation.Animator;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.widget.FrameLayout;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.airbnb.lottie.LottieAnimationView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleNativeAuthPlugin.class);
        super.onCreate(savedInstanceState);

        // 1. PREPARE FULL SCREEN FOR SPLASH
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        // Hide status and navigation bars immediately
        WindowInsetsControllerCompat controller =
                new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);

        // 2. INFLATE AND ADD SPLASH OVERLAY
        LayoutInflater inflater = getLayoutInflater();
        View splashOverlay = inflater.inflate(R.layout.activity_splash, null);

        addContentView(
                splashOverlay,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        LottieAnimationView lottieView = splashOverlay.findViewById(R.id.lottieAnimationView);

        lottieView.addAnimatorListener(new Animator.AnimatorListener() {
            @Override
            public void onAnimationEnd(Animator animation) {
                runOnUiThread(() -> {
                    if (splashOverlay.getParent() != null) {
                        ((ViewGroup) splashOverlay.getParent()).removeView(splashOverlay);

                        // 3. REVERT TO NORMAL MODE
                        // Show the status bar and navigation bar again for the Capacitor Webview
                        controller.show(WindowInsetsCompat.Type.systemBars());

                        // Re-enable standard fit behavior so Webview doesn't sit under the bar
                        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
                    }
                });
            }

            @Override public void onAnimationStart(Animator animation) {}
            @Override public void onAnimationCancel(Animator animation) {}
            @Override public void onAnimationRepeat(Animator animation) {}
        });
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        // This ensures that when the payment gateway redirects back
        // to the app, Capacitor handles the URL correctly.
        setIntent(intent);
    }
}