package com.hmacs.medmacs;

import android.animation.Animator;
import android.os.Build;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

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
        registerPlugin(MetaAppEventsPlugin.class);
        registerPlugin(GoogleAnalyticsPlugin.class);
        registerPlugin(InstallStatePlugin.class);
        super.onCreate(savedInstanceState);

        showSplashOverlay();
    }

    private void showSplashOverlay() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        WindowInsetsControllerCompat controller =
                new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );

        LayoutInflater inflater = getLayoutInflater();
        View splashOverlay = inflater.inflate(R.layout.activity_splash, null);

        addContentView(
                splashOverlay,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        View logo = splashOverlay.findViewById(R.id.splash_logo);
        View title = splashOverlay.findViewById(R.id.splash_title);
        View footer = splashOverlay.findViewById(R.id.splash_footer);

        if (logo == null || title == null || footer == null) {
            removeSplashOverlay(splashOverlay, controller);
            return;
        }

        logo.setAlpha(0f);
        logo.setScaleX(0.85f);
        logo.setScaleY(0.85f);
        title.setAlpha(0f);
        title.setTranslationY(30f);
        footer.setAlpha(0f);

        logo.animate()
                .alpha(1f)
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(800)
                .setStartDelay(200)
                .start();

        title.animate()
                .alpha(1f)
                .translationY(0f)
                .setDuration(800)
                .setStartDelay(600)
                .start();

        footer.animate()
                .alpha(1f)
                .setDuration(800)
                .setStartDelay(1000)
                .setListener(new Animator.AnimatorListener() {
                    @Override
                    public void onAnimationEnd(Animator animation) {
                        splashOverlay.postDelayed(() ->
                                splashOverlay.animate()
                                        .alpha(0f)
                                        .setDuration(400)
                                        .setListener(new Animator.AnimatorListener() {
                                            @Override
                                            public void onAnimationEnd(Animator anim) {
                                                runOnUiThread(() ->
                                                        removeSplashOverlay(splashOverlay, controller)
                                                );
                                            }

                                            @Override public void onAnimationStart(Animator anim) {}
                                            @Override public void onAnimationCancel(Animator anim) {}
                                            @Override public void onAnimationRepeat(Animator anim) {}
                                        })
                                        .start(), 1200);
                    }

                    @Override public void onAnimationStart(Animator animation) {}
                    @Override public void onAnimationCancel(Animator animation) {}
                    @Override public void onAnimationRepeat(Animator animation) {}
                })
                .start();
    }

    private void removeSplashOverlay(View splashOverlay, WindowInsetsControllerCompat controller) {
        if (splashOverlay.getParent() != null) {
            ((ViewGroup) splashOverlay.getParent()).removeView(splashOverlay);
        }

        controller.show(WindowInsetsCompat.Type.systemBars());
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
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
