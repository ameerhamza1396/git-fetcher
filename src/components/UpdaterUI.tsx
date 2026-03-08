// @ts-nocheck
import React from "react";

export default function UpdaterUI({
    visible,
    progress,
    size,
    title,
    message,
    features,
    critical,
    status,
    error
}) {
    if (!visible) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "#0b0b0b",
                color: "white",
                zIndex: 999999,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: 30
            }}
        >
            <h2 style={{ fontSize: 26, marginBottom: 10 }}>{title}</h2>

            <p style={{ opacity: 0.8, marginBottom: 20 }}>{message}</p>

            <div
                style={{
                    width: "80%",
                    height: 10,
                    background: "#333",
                    borderRadius: 10,
                    overflow: "hidden",
                    marginBottom: 10
                }}
            >
                <div
                    style={{
                        width: `${progress}%`,
                        height: "100%",
                        background: "#4ade80",
                        transition: "width 0.2s"
                    }}
                />
            </div>

            <p style={{ marginBottom: 4 }}>
                {status === "installing"
                    ? "Installing update…"
                    : status === "error"
                        ? "Update failed"
                        : `Downloading update… ${progress}%`}
            </p>

            {size && (
                <p style={{ opacity: 0.6, marginBottom: 16 }}>
                    Approx. size: {size} MB
                </p>
            )}

            {error && (
                <p
                    style={{
                        marginTop: 10,
                        color: "#f87171",
                        fontSize: 13,
                        textAlign: "center",
                        maxWidth: 360
                    }}
                >
                    {error}
                </p>
            )}

            {features?.length > 0 && (
                <div style={{ marginTop: 30, maxWidth: 500 }}>
                    <h3 style={{ marginBottom: 10 }}>What's new</h3>

                    <ul style={{ opacity: 0.8 }}>
                        {features.map((f, i) => (
                            <li key={i}>{f}</li>
                        ))}
                    </ul>
                </div>
            )}

            {critical && (
                <p
                    style={{
                        marginTop: 30,
                        color: "#f87171",
                        fontWeight: "bold"
                    }}
                >
                    This update is required to continue using the app
                </p>
            )}
        </div>
    );
}
