import json
import os

log_path = "/Users/user/.gemini/antigravity-ide/brain/3bcd4aac-4a1b-4686-84cf-4b0e395937cc/.system_generated/logs/transcript.jsonl"
out_dir = "/Applications/Arenga/vscode/breakdown_app/scratch"

with open(log_path, 'r') as f:
    for line in f:
        step = json.loads(line)
        step_idx = step.get("step_index")
        content = step.get("content") or ""
        
        if "parseHashRoute" in content:
            # Check length of content
            print(f"Step {step_idx}: length={len(content)}")
