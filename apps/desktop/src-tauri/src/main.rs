// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[tauri::command]
fn open_project_folder(absolute_path: String) -> Result<String, String> {
    // On Windows, replace all forward slashes with backslashes
    #[cfg(target_os = "windows")]
    let absolute_path = absolute_path.replace('/', "\\");

    // Use the absolute path directly
    let full_path = PathBuf::from(&absolute_path);

    // Check if path exists
    if !full_path.exists() {
        return Err(format!("Path does not exist: {}", absolute_path));
    }

    println!("Opening folder: {}", absolute_path);

    // Open the folder using the system's default file explorer
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&absolute_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&absolute_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&absolute_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(absolute_path)
}

#[tauri::command]
fn open_file(absolute_path: String) -> Result<String, String> {
    // On Windows, replace all forward slashes with backslashes
    #[cfg(target_os = "windows")]
    let absolute_path = absolute_path.replace('/', "\\");

    let file_path = PathBuf::from(&absolute_path);

    // Check if path exists
    if !file_path.exists() {
        return Err(format!("File does not exist: {}", absolute_path));
    }

    println!("Opening file: {}", absolute_path);

    // Open the file using the system's default application
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &absolute_path])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&absolute_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&absolute_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    Ok(absolute_path)
}

#[tauri::command]
fn check_path_exists(path: String) -> Result<bool, String> {
    // Check if the path exists
    let path_buf = PathBuf::from(&path);

    match path_buf.try_exists() {
        Ok(exists) => Ok(exists),
        Err(e) => Err(format!("Failed to check path: {}", e)),
    }
}

#[tauri::command]
fn list_directories(path: String) -> Result<Vec<String>, String> {
    let search_path = if path.is_empty() {
        // If empty, list root directories based on OS
        if cfg!(target_os = "windows") {
            // List available drives on Windows
            let mut drives = Vec::new();
            for letter in b'A'..=b'Z' {
                let drive = format!("{}:\\", letter as char);
                let drive_path = PathBuf::from(&drive);
                if drive_path.exists() {
                    drives.push(drive);
                }
            }
            return Ok(drives);
        } else {
            // For Unix-like systems, start at root or home
            PathBuf::from("/")
        }
    } else {
        PathBuf::from(&path)
    };

    // Read directory contents
    match fs::read_dir(&search_path) {
        Ok(entries) => {
            let mut directories = Vec::new();

            for entry in entries {
                if let Ok(entry) = entry {
                    if let Ok(metadata) = entry.metadata() {
                        if metadata.is_dir() {
                            if let Some(name) = entry.file_name().to_str() {
                                // Skip hidden directories (starting with .)
                                if !name.starts_with('.') {
                                    let full_path = entry.path();
                                    if let Some(path_str) = full_path.to_str() {
                                        directories.push(path_str.to_string());
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Sort directories alphabetically
            directories.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));

            Ok(directories)
        }
        Err(e) => Err(format!("Failed to read directory: {}", e)),
    }
}

#[tauri::command]
fn get_project_base_path() -> String {
    std::env::var("HOST_PROJECT_FOLDER").unwrap_or_else(|_| {
        // Use platform-appropriate separators
        if cfg!(target_os = "windows") {
            "N:\\Mandats".to_string()
        } else {
            "N://Mandats".to_string()
        }
    })
}

fn main() {
    // SECURITY WARNING: Setting environment variables to disable SSL verification
    // This makes the application vulnerable to man-in-the-middle attacks
    // Only use this in development or trusted network environments

    #[cfg(target_os = "linux")]
    {
        // For Linux/WebKit, disable TLS verification
        std::env::set_var("WEBKIT_DISABLE_TLS_VERIFICATION", "1");
    }

    #[cfg(target_os = "windows")]
    {
        // For Windows, we'll handle SSL errors in the webview
        std::env::set_var(
            "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
            "--ignore-certificate-errors",
        );
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            open_project_folder,
            open_file,
            check_path_exists,
            list_directories,
            get_project_base_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
