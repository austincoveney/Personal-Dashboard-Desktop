use chrono::Local;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};
use tauri_plugin_store::StoreExt;

fn show_window(app: &AppHandle, label: &str) {
    if let Some(win) = app.get_webview_window(label) {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

fn toggle_widget(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("widget") {
        match win.is_visible() {
            Ok(true) => {
                let _ = win.hide();
            }
            _ => {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }
    }
}

/// Reads (morning_enabled, last_morning, has_token) from the JS-written store, with safe defaults.
fn read_state(app: &AppHandle) -> (bool, String, bool) {
    let mut enabled = true;
    let mut last = String::new();
    let mut has_token = false;
    if let Ok(store) = app.store("settings.json") {
        if let Some(v) = store.get("morningCheckin") {
            if let Some(b) = v.as_bool() {
                enabled = b;
            }
        }
        if let Some(v) = store.get("lastMorning") {
            if let Some(s) = v.as_str() {
                last = s.to_string();
            }
        }
        if let Some(v) = store.get("token") {
            if let Some(s) = v.as_str() {
                has_token = !s.trim().is_empty();
            }
        }
    }
    (enabled, last, has_token)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_window(app, "glance");
        }));
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .setup(|app| {
            let open_i = MenuItem::with_id(app, "open", "Open deck", true, None::<&str>)?;
            let capture_i = MenuItem::with_id(app, "capture", "Quick capture", true, None::<&str>)?;
            let morning_i = MenuItem::with_id(app, "morning", "Morning check-in", true, None::<&str>)?;
            let widget_i = MenuItem::with_id(app, "widget", "Toggle widget", true, None::<&str>)?;
            let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[
                    &open_i,
                    &capture_i,
                    &morning_i,
                    &widget_i,
                    &settings_i,
                    &sep,
                    &quit_i,
                ],
            )?;

            let mut tray_builder = TrayIconBuilder::with_id("main")
                .tooltip("Austin's Deck")
                .menu(&menu)
                .show_menu_on_left_click(false);
            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }
            tray_builder
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_window(app, "glance"),
                    "capture" => show_window(app, "capture"),
                    "morning" => show_window(app, "morning"),
                    "widget" => toggle_widget(app),
                    "settings" => show_window(app, "settings"),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_window(tray.app_handle(), "glance");
                    }
                })
                .build(app)?;

            let handle = app.handle().clone();
            let autostarted = std::env::args().any(|a| a == "--autostart");
            let today = Local::now().format("%Y-%m-%d").to_string();
            let (morning_enabled, last_morning, has_token) = read_state(&handle);

            if !has_token {
                show_window(&handle, "settings");
            } else if morning_enabled && last_morning != today {
                show_window(&handle, "morning");
            } else if !autostarted {
                show_window(&handle, "glance");
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running the desktop app");
}
