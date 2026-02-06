// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::path::PathBuf;

#[tauri::command]
fn open_project_folder(relative_path: String) -> Result<String, String> {
    // Get base path from environment variable or use default
    let base_path =
        std::env::var("HOST_PROJECT_FOLDER").unwrap_or_else(|_| "N://Mandats".to_string());

    // Combine base path with relative path
    let mut full_path = PathBuf::from(base_path);

    // Remove leading slash from relative path if present
    let clean_relative = relative_path
        .trim_start_matches('/')
        .trim_start_matches('\\');
    full_path.push(clean_relative);

    // Convert to string for opening
    let path_str = full_path.to_string_lossy().to_string();

    println!("Opening folder: {}", path_str);

    // Open the folder using the system's default file explorer
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path_str)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path_str)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path_str)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(path_str)
}

#[tauri::command]
fn get_project_base_path() -> String {
    std::env::var("HOST_PROJECT_FOLDER").unwrap_or_else(|_| "N://Mandats".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![
            open_project_folder,
            get_project_base_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
