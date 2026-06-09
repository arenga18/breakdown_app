import os
import json
import shutil
import datetime

history_dir = os.path.expanduser('~/Library/Application Support/Code/User/History')
workspace_dir = '/Applications/Arenga/vscode/breakdown_app'
recovery_out = os.path.join(workspace_dir, 'recovered_vscode')

if not os.path.exists(history_dir):
    print("VS Code history directory not found.")
    exit(1)

print(f"Scanning VS Code history at: {history_dir}")
os.makedirs(recovery_out, exist_ok=True)

# Find all entries.json files in history_dir
found_files = {}

for root, dirs, files in os.walk(history_dir):
    if 'entries.json' in files:
        entries_path = os.path.join(root, 'entries.json')
        try:
            with open(entries_path) as f:
                data = json.load(f)
            
            resource = data.get('resource', '')
            # resource is a URL like "file:///Applications/Arenga/vscode/breakdown_app/src/App.js"
            if 'breakdown_app' in resource:
                # Get the actual path
                filepath = resource.replace('file://', '')
                if os.name == 'nt' and filepath.startswith('/'):
                    filepath = filepath[1:]
                
                # Normalize path
                filepath = os.path.abspath(filepath)
                
                # Find all entries in this folder
                entries = data.get('entries', [])
                for entry in entries:
                    id_val = entry.get('id')
                    timestamp = entry.get('timestamp') # epoch ms
                    
                    # File name in the history folder is same as id_val
                    entry_file = os.path.join(root, id_val)
                    if os.path.exists(entry_file):
                        found_files.setdefault(filepath, []).append({
                            'id': id_val,
                            'timestamp': timestamp,
                            'path': entry_file
                        })
        except Exception as e:
            pass

print(f"Found history entries for {len(found_files)} files.")

for filepath, entries in sorted(found_files.items()):
    # Sort entries by timestamp descending (latest first)
    entries.sort(key=lambda x: x['timestamp'], reverse=True)
    
    # Get relative path to workspace
    rel_path = os.path.relpath(filepath, workspace_dir)
    
    # Let's print the latest entry timestamp
    latest = entries[0]
    dt = datetime.datetime.fromtimestamp(latest['timestamp'] / 1000.0)
    print(f"File: {rel_path} | Latest backup: {dt} ({len(entries)} versions)")
    
    # Copy latest to recovery_out
    out_path = os.path.join(recovery_out, rel_path)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    shutil.copy2(latest['path'], out_path)

print(f"\nAll latest versions copied to: {recovery_out}")
